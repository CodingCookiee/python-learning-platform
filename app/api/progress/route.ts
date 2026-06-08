import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { getCached, CacheKeys } from "@/lib/cache";

/**
 * GET /api/progress
 * Get user's complete progress across all modules
 */
export const GET = withAuth(async (req: NextRequest, context: { userId: string }) => {
  try {
    const cacheKey = CacheKeys.userProgress(context.userId);

    const progressData = await getCached(
      cacheKey,
      async () => {
        // Get user with current XP and level
        const user = await prisma.user.findUnique({
          where: { id: context.userId },
          select: {
            id: true,
            name: true,
            email: true,
            xp: true,
            level: true,
          },
        });

        if (!user) {
          throw new Error("User not found");
        }

        // Get all completed lessons
        const completedLessons = await prisma.progress.findMany({
          where: {
            userId: context.userId,
            completed: true,
          },
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                moduleId: true,
                order: true,
              },
            },
          },
        });

        // Get all passed exercises
        const passedExercises = await prisma.exerciseSubmission.findMany({
          where: {
            userId: context.userId,
            passed: true,
          },
          distinct: ["exerciseId"],
          select: {
            exerciseId: true,
            submittedAt: true,
          },
        });

        // Get approved projects
        const approvedProjects = await prisma.projectSubmission.findMany({
          where: {
            userId: context.userId,
            status: "approved",
          },
          include: {
            project: {
              select: {
                id: true,
                title: true,
                moduleId: true,
                xpReward: true,
              },
            },
          },
        });

        // Get unlocked achievements
        const unlockedAchievements = await prisma.userAchievement.findMany({
          where: { userId: context.userId },
          include: {
            achievement: true,
          },
          orderBy: { unlockedAt: "desc" },
        });

        // Get streak information
        let streak = await prisma.streak.findUnique({
          where: { userId: context.userId },
        });

        // If no streak record, create one
        if (!streak) {
          streak = await prisma.streak.create({
            data: {
              userId: context.userId,
              currentStreak: 0,
              longestStreak: 0,
              lastActivityDate: new Date(),
            },
          });
        }

        // Calculate overall completion
        const totalModules = await prisma.module.count();
        const totalLessons = await prisma.lesson.count();
        const totalProjects = await prisma.project.count();

        const overallCompletion = {
          lessons: {
            completed: completedLessons.length,
            total: totalLessons,
            percentage: Math.round((completedLessons.length / totalLessons) * 100),
          },
          exercises: {
            completed: passedExercises.length,
            // We'll update this when exercises are added
            total: 0,
            percentage: 0,
          },
          projects: {
            completed: approvedProjects.length,
            total: totalProjects,
            percentage: Math.round((approvedProjects.length / totalProjects) * 100),
          },
          overall: Math.round(
            ((completedLessons.length + approvedProjects.length) / (totalLessons + totalProjects)) *
              100
          ),
        };

        // Module-by-module progress
        const modules = await prisma.module.findMany({
          orderBy: { order: "asc" },
          include: {
            lessons: {
              select: { id: true },
            },
            projects: {
              select: { id: true },
            },
          },
        });

        const moduleProgress = modules.map((module) => {
          const moduleLessonIds = module.lessons.map((l) => l.id);
          const completedInModule = completedLessons.filter((cl) =>
            moduleLessonIds.includes(cl.lesson.id)
          ).length;

          const moduleProjectIds = module.projects.map((p) => p.id);
          const completedProjects = approvedProjects.filter((ap) =>
            moduleProjectIds.includes(ap.project.id)
          ).length;

          const totalItems = module.lessons.length + module.projects.length;
          const completedItems = completedInModule + completedProjects;

          return {
            moduleId: module.id,
            moduleTitle: module.title,
            lessonsCompleted: completedInModule,
            lessonsTotal: module.lessons.length,
            projectsCompleted: completedProjects,
            projectsTotal: module.projects.length,
            completionPercentage:
              totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
          };
        });

        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            xp: user.xp,
            level: user.level,
          },
          streak: {
            current: streak.currentStreak,
            longest: streak.longestStreak,
            lastActivity: streak.lastActivityDate,
          },
          completion: overallCompletion,
          modules: moduleProgress,
          recentActivity: {
            lessons: completedLessons.slice(-5).reverse(),
            projects: approvedProjects.slice(-3).reverse(),
          },
          achievements: {
            unlocked: unlockedAchievements.map((ua) => ({
              id: ua.achievement.id,
              name: ua.achievement.name,
              description: ua.achievement.description,
              icon: ua.achievement.icon,
              category: ua.achievement.category,
              tier: ua.achievement.tier,
              xpReward: ua.achievement.xpReward,
              unlockedAt: ua.unlockedAt,
            })),
            total: unlockedAchievements.length,
          },
        };
      },
      1800 // Cache for 30 minutes
    );

    return NextResponse.json(progressData);
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
});
