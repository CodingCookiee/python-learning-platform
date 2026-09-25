import { prisma } from "@/lib/prisma";
import { getCurriculumState } from "@/lib/curriculum-state";

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
        where: { moduleId: prereq.id, archivedAt: null },
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

/** Module id → unlocked, for every live module in every track (see lib/curriculum-state.ts). */
export async function getSequentialModuleUnlockMap(userId: string): Promise<Map<string, boolean>> {
  const tracks = await getCurriculumState(userId);
  const unlockMap = new Map<string, boolean>();
  for (const track of tracks) for (const m of track.modules) unlockMap.set(m.id, m.unlocked);
  return unlockMap;
}
