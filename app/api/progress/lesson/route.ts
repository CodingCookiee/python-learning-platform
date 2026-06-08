import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
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

    // Verify lesson exists
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Upsert progress record
    const progress = await prisma.progress.upsert({
      where: {
        userId_lessonId: {
          userId: context.userId,
          lessonId,
        },
      },
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

    // Calculate XP reward (10 XP per lesson)
    let xpGained = 0;
    if (completed) {
      xpGained = 10;

      // Update user XP
      await prisma.user.update({
        where: { id: context.userId },
        data: {
          xp: { increment: xpGained },
        },
      });
    }

    // Invalidate user caches
    await invalidateUserCache(context.userId);

    // Check for achievements
    const achievements = await checkLessonAchievements(context.userId, lessonId);

    return NextResponse.json({
      success: true,
      progress,
      xpGained,
      achievements,
    });
  } catch (error) {
    console.error("Error updating lesson progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
});

/**
 * Check for achievements after lesson completion
 */
async function checkLessonAchievements(userId: string, lessonId: string): Promise<string[]> {
  const achievements: string[] = [];

  try {
    // Get lesson with module info
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });

    if (!lesson) return achievements;

    // Check "First Steps" - Complete first lesson
    const completedLessonsCount = await prisma.progress.count({
      where: { userId, completed: true },
    });

    if (completedLessonsCount === 1) {
      await unlockAchievement(userId, "First Steps");
      achievements.push("First Steps");
    }

    // Check module completion achievements
    const moduleId = lesson.moduleId;
    const allModuleLessons = await prisma.lesson.findMany({
      where: { moduleId },
      select: { id: true },
    });

    const completedInModule = await prisma.progress.count({
      where: {
        userId,
        lessonId: { in: allModuleLessons.map((l) => l.id) },
        completed: true,
      },
    });

    // If all lessons in module completed
    if (completedInModule === allModuleLessons.length) {
      const achievementNames: Record<number, string> = {
        1: "Hello, Python!",
        2: "Data Master",
        3: "Function Expert",
      };

      const achievementName = achievementNames[lesson.module.order];
      if (achievementName) {
        await unlockAchievement(userId, achievementName);
        achievements.push(achievementName);
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
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
