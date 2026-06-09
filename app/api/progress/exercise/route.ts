import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { checkAndUnlockAchievements, updateStreak, updateUserLevel } from "@/lib/achievements";
import { z } from "zod";

const exerciseSubmissionSchema = z.object({
  exerciseId: z.string().min(1, "Exercise ID is required"),
  code: z.string().min(1, "Code is required"),
  passed: z.boolean(),
  testResults: z.string(),
  hintsUsed: z.number().int().min(0).default(0),
});

/**
 * POST /api/progress/exercise
 * Record an exercise submission
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const body = await req.json();
    const validation = exerciseSubmissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { exerciseId, code, passed, testResults, hintsUsed } = validation.data;

    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const previousAttempts = await prisma.exerciseSubmission.count({
      where: { userId: context.userId, exerciseId },
    });

    const submission = await prisma.exerciseSubmission.create({
      data: {
        userId: context.userId,
        exerciseId,
        code,
        passed,
        testResults,
        hintsUsed,
        attempts: previousAttempts + 1,
      },
    });

    let xpGained = 0;
    const newAchievements = [];

    if (passed) {
      const alreadyPassed = await prisma.exerciseSubmission.findFirst({
        where: { userId: context.userId, exerciseId, passed: true, id: { not: submission.id } },
      });

      if (!alreadyPassed) {
        xpGained = exercise.xpReward;
        await prisma.user.update({
          where: { id: context.userId },
          data: { xp: { increment: xpGained } },
        });
        await updateUserLevel(context.userId);
      }

      const exerciseAchievements = await checkAndUnlockAchievements(context.userId, {
        type: "exercise_pass",
        exerciseId,
      });
      newAchievements.push(...exerciseAchievements);

      await updateStreak(context.userId);

      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { xp: true },
      });
      if (user) {
        const xpAchievements = await checkAndUnlockAchievements(context.userId, {
          type: "xp_update",
          totalXp: user.xp,
        });
        newAchievements.push(...xpAchievements);
      }
    }

    await invalidateUserCache(context.userId);

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        passed: submission.passed,
        attempts: submission.attempts,
        hintsUsed: submission.hintsUsed,
      },
      xpGained,
      achievements: newAchievements,
    });
  } catch (error) {
    console.error("Error recording exercise submission:", error);
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }
});
