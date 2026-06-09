import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache, invalidateCache, CacheKeys } from "@/lib/cache";
import { checkAndUnlockAchievements, updateStreak, updateUserLevel } from "@/lib/achievements";
import { z } from "zod";

const submitSchema = z.object({
  code: z.string().min(1, "Code is required"),
  passed: z.boolean(),
  testResults: z.string(),
  hintsUsed: z.number().int().min(0).default(0),
});

/**
 * POST /api/exercises/[id]/submit
 * Submit an exercise attempt with test results.
 * Records the submission, awards XP on first solve, checks achievements.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id: exerciseId } = await context.params;

    const body = await req.json();
    const validation = submitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { code, passed, testResults, hintsUsed } = validation.data;

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
      // Only award XP on first solve
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

    // Invalidate exercise cache so next GET returns updated solution eligibility
    await invalidateCache(CacheKeys.exercise(exerciseId, context.userId));
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
      newlySolved: passed && xpGained > 0,
      achievements: newAchievements,
    });
  } catch (error) {
    console.error("Error submitting exercise:", error);
    return NextResponse.json({ error: "Failed to submit exercise" }, { status: 500 });
  }
});
