import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-auth";
import { getCached, CacheKeys } from "@/lib/cache";

/**
 * GET /api/modules
 * List all modules with prerequisites and basic info
 * Cached for 1 hour per user
 */
export const GET = withAuth(async (req: NextRequest, context: { userId: string }) => {
  try {
    const cacheKey = CacheKeys.modules(context.userId);

    const modulesWithProgress = await getCached(
      cacheKey,
      async () => {
        const modules = await prisma.module.findMany({
          orderBy: { order: "asc" },
          include: {
            lessons: {
              select: {
                id: true,
                title: true,
                order: true,
              },
              orderBy: { order: "asc" },
            },
            projects: {
              select: {
                id: true,
                title: true,
              },
            },
            prerequisites: {
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
            _count: {
              select: {
                lessons: true,
                projects: true,
              },
            },
          },
        });

        // Get user's progress for each module
        return await Promise.all(
          modules.map(async (module) => {
            const lessonIds = module.lessons.map((l) => l.id);

            // Count completed lessons for this user
            const completedCount = await prisma.progress.count({
              where: {
                userId: context.userId,
                lessonId: { in: lessonIds },
                completed: true,
              },
            });

            const totalLessons = module._count.lessons;
            const completionPercentage =
              totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            // Check if prerequisites are met
            const prerequisitesCompleted = await Promise.all(
              module.prerequisites.map(async (prereq) => {
                const prereqLessons = await prisma.lesson.findMany({
                  where: { moduleId: prereq.id },
                  select: { id: true },
                });
                const prereqLessonIds = prereqLessons.map((l) => l.id);
                const prereqCompletedCount = await prisma.progress.count({
                  where: {
                    userId: context.userId,
                    lessonId: { in: prereqLessonIds },
                    completed: true,
                  },
                });
                return prereqCompletedCount === prereqLessonIds.length;
              })
            );

            const isUnlocked =
              module.prerequisites.length === 0 ||
              prerequisitesCompleted.every((completed) => completed);

            return {
              id: module.id,
              title: module.title,
              description: module.description,
              phase: module.phase,
              order: module.order,
              duration: module.duration,
              lessonCount: module._count.lessons,
              projectCount: module._count.projects,
              completionPercentage,
              isUnlocked,
              prerequisites: module.prerequisites,
              lessons: module.lessons,
              projects: module.projects,
            };
          })
        );
      },
      3600 // Cache for 1 hour
    );

    return NextResponse.json({
      modules: modulesWithProgress,
      total: modulesWithProgress.length,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json({ error: "Failed to fetch modules" }, { status: 500 });
  }
});
