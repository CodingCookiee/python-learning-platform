import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import {
  checkAndUnlockAchievements,
  updateStreak,
  updateUserLevel,
  checkMilestone,
} from "@/lib/achievements";
import { z } from "zod";

const lessonProgressSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"),
  completed: z.boolean(),
});

/**
 * POST /api/progress/lesson
 * Mark a lesson as complete or incomplete
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const body = await req.json();
    const validation = lessonProgressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { lessonId, completed } = validation.data;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const progress = await prisma.progress.upsert({
      where: { userId_lessonId: { userId: context.userId, lessonId } },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: context.userId,
        lessonId,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    let xpGained = 0;
    let levelUp = false;
    let newLevel = 0;

    // Read current level before any XP award
    const userBefore = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { level: true },
    });
    const oldLevel = userBefore?.level ?? 1;

    if (completed) {
      xpGained = 10;
      await prisma.user.update({
        where: { id: context.userId },
        data: { xp: { increment: xpGained } },
      });
      await updateUserLevel(context.userId);
    }

    await invalidateUserCache(context.userId);

    const newAchievements = completed
      ? await checkAndUnlockAchievements(context.userId, { type: "lesson_complete", lessonId })
      : [];

    if (completed) {
      await updateStreak(context.userId);

      // Check XP achievements after all XP has been awarded
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

    // Read updated level after all XP and level updates
    const userAfter = await prisma.user.findUnique({
      where: { id: context.userId },
      select: { level: true },
    });
    newLevel = userAfter?.level ?? oldLevel;
    levelUp = newLevel > oldLevel;

    // Milestone detection
    const milestone = completed ? await checkMilestone(context.userId) : null;

    return NextResponse.json({
      success: true,
      progress,
      xpGained,
      achievements: newAchievements,
      levelUp,
      newLevel,
      milestone,
    });
  } catch (error) {
    console.error("Error updating lesson progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
});
