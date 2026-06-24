import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { getCached, CacheKeys } from "@/lib/cache";
import { getLessonContent, getLessonEstimatedTime } from "@/lib/lesson-content";
import { canCompleteLesson, getSequentialModuleUnlockMap } from "@/lib/module-access";

/**
 * GET /api/lessons/[id]
 * Get lesson content with exercises and progress
 * Cached for 1 hour per user
 */
export const GET = withAuth(async (req: NextRequest, context: AuthContext<{ id: string }>) => {
  try {
    const { id } = await context.params;
    const cacheKey = CacheKeys.lesson(id, context.userId);

    const response = await getCached(
      cacheKey,
      async () => {
        const lesson = await prisma.lesson.findUnique({
          where: { id },
          include: {
            module: {
              select: {
                id: true,
                title: true,
                order: true,
              },
            },
            exercises: {
              orderBy: { order: "asc" },
              include: {
                submissions: {
                  where: { userId: context.userId },
                  orderBy: { submittedAt: "desc" },
                  take: 1,
                  select: {
                    id: true,
                    passed: true,
                    attempts: true,
                    hintsUsed: true,
                    submittedAt: true,
                  },
                },
              },
            },
            progress: {
              where: { userId: context.userId },
            },
          },
        });

        if (!lesson) {
          return null;
        }

        // Get previous and next lessons for navigation
        const siblingLessons = await prisma.lesson.findMany({
          where: { moduleId: lesson.moduleId },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            progress: {
              where: { userId: context.userId },
              select: { completed: true },
            },
          },
        });

        const currentIndex = siblingLessons.findIndex((l) => l.id === lesson.id);
        const previousLesson = currentIndex > 0 ? siblingLessons[currentIndex - 1] : null;
        const nextLesson =
          currentIndex < siblingLessons.length - 1 ? siblingLessons[currentIndex + 1] : null;
        const moduleUnlockMap = await getSequentialModuleUnlockMap(context.userId);
        const isUnlocked = moduleUnlockMap.get(lesson.module.id) ?? false;
        const lessonUnlocked = canCompleteLesson(
          siblingLessons.map((item) => ({
            id: item.id,
            title: item.title,
            order: item.order,
            completed: item.progress[0]?.completed || false,
          })),
          lesson.id,
          isUnlocked
        );

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          content: getLessonContent({
            moduleTitle: lesson.module.title,
            title: lesson.title,
            description: lesson.description,
            content: lesson.content,
          }),
          order: lesson.order,
          estimatedTime: getLessonEstimatedTime(
            lesson.module.title,
            lesson.title,
            lesson.estimatedTime
          ),
          module: {
            ...lesson.module,
            isUnlocked: lessonUnlocked,
          },
          completed: lesson.progress[0]?.completed || false,
          completedAt: lesson.progress[0]?.completedAt || null,
          exercises: lesson.exercises.map((exercise) => ({
            id: exercise.id,
            title: exercise.title,
            description: exercise.description,
            difficulty: exercise.difficulty,
            order: exercise.order,
            xpReward: exercise.xpReward,
            hasSubmission: exercise.submissions.length > 0,
            latestSubmission: exercise.submissions[0] || null,
          })),
          navigation: {
            previous: previousLesson,
            next: nextLesson,
          },
        };
      },
      3600 // Cache for 1 hour
    );

    if (!response) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return NextResponse.json({ error: "Failed to fetch lesson" }, { status: 500 });
  }
});
