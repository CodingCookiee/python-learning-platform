import { prisma } from "@/lib/prisma";

export interface PrerequisiteStatus {
  id: string;
  title: string;
  order: number;
  completed: boolean;
}

export interface LessonAccessStatus {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  isUnlocked: boolean;
}

export interface ModuleUnlockStatus {
  id: string;
  order: number;
  isUnlocked: boolean;
}

export async function getPrerequisiteStatuses(
  prerequisites: Array<{ id: string; title: string; order: number }>,
  userId: string
): Promise<PrerequisiteStatus[]> {
  return Promise.all(
    prerequisites.map(async (prereq) => {
      const prereqLessons = await prisma.lesson.findMany({
        where: { moduleId: prereq.id },
        select: { id: true },
      });

      if (prereqLessons.length === 0) {
        return { ...prereq, completed: true };
      }

      const completedCount = await prisma.progress.count({
        where: {
          userId,
          lessonId: { in: prereqLessons.map((lesson) => lesson.id) },
          completed: true,
        },
      });

      return {
        ...prereq,
        completed: completedCount === prereqLessons.length,
      };
    })
  );
}

export function getModuleUnlockState(prerequisites: PrerequisiteStatus[]) {
  const unmetPrerequisites = prerequisites.filter((prereq) => !prereq.completed);

  return {
    isUnlocked: unmetPrerequisites.length === 0,
    unmetPrerequisites,
  };
}

export function getLessonAccessState(
  lessons: Array<{ id: string; title: string; order: number; completed: boolean }>,
  moduleIsUnlocked: boolean
): LessonAccessStatus[] {
  return lessons.map((lesson) => {
    const priorLessons = lessons.filter((item) => item.order < lesson.order);
    const previousLessonsCompleted = priorLessons.every((item) => item.completed);

    return {
      ...lesson,
      isUnlocked: moduleIsUnlocked && previousLessonsCompleted,
    };
  });
}

export function canCompleteLesson(
  lessons: Array<{ id: string; title: string; order: number; completed: boolean }>,
  lessonId: string,
  moduleIsUnlocked: boolean
): boolean {
  const target = lessons.find((lesson) => lesson.id === lessonId);
  if (!target) return false;

  const priorLessons = lessons.filter((lesson) => lesson.order < target.order);
  return moduleIsUnlocked && priorLessons.every((lesson) => lesson.completed);
}

export async function getSequentialModuleUnlockMap(userId: string): Promise<Map<string, boolean>> {
  const modules = await prisma.module.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      lessons: {
        select: { id: true },
      },
    },
  });

  const completedLessons = await prisma.progress.findMany({
    where: {
      userId,
      completed: true,
    },
    select: { lessonId: true },
  });
  const completedLessonIds = new Set(completedLessons.map((lesson) => lesson.lessonId));

  const unlockMap = new Map<string, boolean>();
  let priorModulesCompleted = true;

  for (const curriculumModule of modules) {
    unlockMap.set(curriculumModule.id, priorModulesCompleted);

    const moduleLessonIds = curriculumModule.lessons.map((lesson) => lesson.id);
    const moduleCompleted =
      moduleLessonIds.length === 0 ||
      moduleLessonIds.every((lessonId) => completedLessonIds.has(lessonId));

    priorModulesCompleted = priorModulesCompleted && moduleCompleted;
  }

  return unlockMap;
}
