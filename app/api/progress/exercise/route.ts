import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
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
export const POST = withAuth(async (req: NextRequest, context: { userId: string }) => {
  try {
    const body = await req.json();
    const validation = exerciseSubmissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { exerciseId, code, passed, testResults, hintsUsed } = validation.data;

    // Verify exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // Get previous attempts count
    const previousAttempts = await prisma.exerciseSubmission.count({
      where: {
        userId: context.userId,
        exerciseId,
      },
    });

    // Create submission
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

    // Award XP if passed for the first time
    let xpGained = 0;
    if (passed) {
      const previousPassed = await prisma.exerciseSubmission.findFirst({
        where: {
          userId: context.userId,
          exerciseId,
          passed: true,
        },
      });

      if (!previousPassed) {
        xpGained = exercise.xpReward;

        await prisma.user.update({
          where: { id: context.userId },
          data: {
            xp: { increment: xpGained },
          },
        });
      }
    }

    // Invalidate user caches
    await invalidateUserCache(context.userId);

    // Check for achievements
    const achievements = await checkExerciseAchievements(context.userId);

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        passed: submission.passed,
        attempts: submission.attempts,
        hintsUsed: submission.hintsUsed,
      },
      xpGained,
      achievements,
    });
  } catch (error) {
    console.error("Error recording exercise submission:", error);
    return NextResponse.json({ error: "Failed to record submission" }, { status: 500 });
  }
});

/**
 * Check for exercise-related achievements
 */
async function checkExerciseAchievements(userId: string): Promise<string[]> {
  const achievements: string[] = [];

  try {
    // Count unique exercises completed
    const completedExercises = await prisma.exerciseSubmission.findMany({
      where: {
        userId,
        passed: true,
      },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    });

    const completedCount = completedExercises.length;

    // Check achievement thresholds
    const thresholds = [
      { count: 10, name: "Problem Solver" },
      { count: 25, name: "Coding Machine" },
      { count: 50, name: "Exercise Champion" },
    ];

    for (const threshold of thresholds) {
      if (completedCount === threshold.count) {
        await unlockAchievement(userId, threshold.name);
        achievements.push(threshold.name);
      }
    }
  } catch (error) {
    console.error("Error checking exercise achievements:", error);
  }

  return achievements;
}

/**
 * Unlock an achievement for a user
 */
async function unlockAchievement(userId: string, achievementName: string): Promise<void> {
  try {
    const achievement = await prisma.achievement.findUnique({
      where: { name: achievementName },
    });

    if (!achievement) return;

    // Check if already unlocked
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
    });

    if (existing) return;

    // Unlock achievement
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementId: achievement.id,
      },
    });

    // Award XP
    if (achievement.xpReward > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          xp: { increment: achievement.xpReward },
        },
      });
    }
  } catch (error) {
    console.error("Error unlocking achievement:", error);
  }
}
