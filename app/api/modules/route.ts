import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getCached, CacheKeys } from "@/lib/cache";
import { getModuleDisplayDuration } from "@/lib/module-duration";
import { getLessonAccessState, getSequentialModuleUnlockMap } from "@/lib/module-access";

/**
 * GET /api/modules
 * List all modules with prerequisites and basic info
 * Cached for 1 hour per user
 */
export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
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
        const moduleUnlockMap = await getSequentialModuleUnlockMap(context.userId);

        return await Promise.all(
          modules.map(async (module) => {
            const lessonIds = module.lessons.map((l) => l.id);
            const lessonProgress = await prisma.progress.findMany({
              where: {
                userId: context.userId,
                lessonId: { in: lessonIds },
              },
              select: {
                lessonId: true,
                completed: true,
              },
            });
            const lessonProgressMap = new Map(
              lessonProgress.map((progress) => [progress.lessonId, progress.completed])
            );

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

            const lessonAccess = getLessonAccessState(
              module.lessons.map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                order: lesson.order,
                completed: lessonProgressMap.get(lesson.id) ?? false,
              })),
              moduleUnlockMap.get(module.id) ?? false
            );
            const lessonAccessMap = new Map(
              lessonAccess.map((lesson) => [lesson.id, lesson.isUnlocked])
            );

            return {
              id: module.id,
              title: module.title,
              description: module.description,
              phase: module.phase,
              order: module.order,
              duration: getModuleDisplayDuration(module.title, module.duration),
              lessonCount: module._count.lessons,
              projectCount: module._count.projects,
              completionPercentage,
              isUnlocked: moduleUnlockMap.get(module.id) ?? false,
              prerequisites: module.prerequisites,
              lessons: module.lessons.map((lesson) => ({
                ...lesson,
                isUnlocked: lessonAccessMap.get(lesson.id) ?? false,
              })),
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
