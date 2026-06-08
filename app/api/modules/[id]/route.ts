import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getCached, CacheKeys } from "@/lib/cache";

/**
 * GET /api/modules/[id]
 * Get module details with all lessons and projects
 * Cached for 1 hour per user
 */
export const GET = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const cacheKey = CacheKeys.module(id, context.userId);

    const response = await getCached(
      cacheKey,
      async () => {
        const learningModule = await prisma.module.findUnique({
          where: { id },
          include: {
            lessons: {
              orderBy: { order: "asc" },
              include: {
                exercises: {
                  select: {
                    id: true,
                    title: true,
                    difficulty: true,
                    xpReward: true,
                  },
                },
                progress: {
                  where: { userId: context.userId },
                  select: {
                    completed: true,
                    completedAt: true,
                  },
                },
              },
            },
            projects: {
              include: {
                submissions: {
                  where: { userId: context.userId },
                  orderBy: { submittedAt: "desc" },
                  take: 1,
                },
              },
            },
            prerequisites: {
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
            dependents: {
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
          },
        });

        if (!learningModule) {
          return null;
        }

        // Calculate module completion
        const totalLessons = learningModule.lessons.length;
        const completedLessons = learningModule.lessons.filter(
          (lesson) => lesson.progress[0]?.completed
        ).length;
        const completionPercentage =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        // Check if prerequisites are met
        const prerequisitesCompleted = await Promise.all(
          learningModule.prerequisites.map(async (prereq) => {
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
          learningModule.prerequisites.length === 0 ||
          prerequisitesCompleted.every((completed) => completed);

        return {
          id: learningModule.id,
          title: learningModule.title,
          description: learningModule.description,
          phase: learningModule.phase,
          order: learningModule.order,
          duration: learningModule.duration,
          completionPercentage,
          isUnlocked,
          prerequisites: learningModule.prerequisites,
          dependents: learningModule.dependents,
          lessons: learningModule.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            order: lesson.order,
            estimatedTime: lesson.estimatedTime,
            exerciseCount: lesson.exercises.length,
            completed: lesson.progress[0]?.completed || false,
            completedAt: lesson.progress[0]?.completedAt || null,
          })),
          projects: learningModule.projects.map((project) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            estimatedTime: project.estimatedTime,
            xpReward: project.xpReward,
            hasSubmission: project.submissions.length > 0,
            latestSubmission: project.submissions[0] || null,
          })),
        };
      },
      3600 // Cache for 1 hour
    );

    if (!response) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching module:", error);
    return NextResponse.json({ error: "Failed to fetch module" }, { status: 500 });
  }
});
