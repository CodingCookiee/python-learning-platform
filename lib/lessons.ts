import { prisma } from "@/lib/prisma";
import { getSequentialModuleUnlockMap } from "@/lib/module-access";

/**
 * Lesson rules (see docs/ARCHITECTURE.md §6):
 * - Anyone can read a lesson in an unlocked module, even ahead of their progress.
 * - A lesson can be completed once the earlier lessons in its module are complete
 *   AND every required drill in it has passed. Practice is what completes a lesson,
 *   not reading.
 */

export interface LessonDrill {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  type: string;
  xpReward: number;
  required: boolean;
  passed: boolean;
  attempted: boolean;
}

export interface LessonView {
  id: string;
  title: string;
  description: string;
  content: string;
  estimatedTime: number;
  completed: boolean;
  module: { id: string; title: string };
  moduleUnlocked: boolean;
  /** Earlier lessons in the module are complete */
  inSequence: boolean;
  drills: LessonDrill[];
  requiredRemaining: number;
  canComplete: boolean;
  lessons: Array<{
    id: string;
    title: string;
    order: number;
    completed: boolean;
    estimatedTime: number;
    isUnlocked: boolean;
  }>;
  index: number;
  previous: { id: string; title: string; order: number } | null;
  next: { id: string; title: string; order: number } | null;
}

/** Required drills of a lesson the learner hasn't passed yet */
export async function requiredDrillsRemaining(lessonId: string, userId: string): Promise<number> {
  const required = await prisma.exercise.findMany({
    where: { lessonId, archivedAt: null, required: true },
    select: { id: true, submissions: { where: { userId, passed: true }, select: { id: true }, take: 1 } },
  });
  return required.filter((e) => e.submissions.length === 0).length;
}

export async function getLessonForUser(id: string, userId: string): Promise<LessonView | null> {
  const lesson = await prisma.lesson.findFirst({
    where: { id, archivedAt: null, module: { archivedAt: null } },
    include: {
      module: {
        select: {
          id: true,
          title: true,
          lessons: {
            where: { archivedAt: null },
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              order: true,
              estimatedTime: true,
              progress: { where: { userId }, select: { completed: true } },
            },
          },
        },
      },
      exercises: {
        where: { archivedAt: null },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          type: true,
          xpReward: true,
          required: true,
          submissions: { where: { userId }, select: { passed: true } },
        },
      },
    },
  });
  if (!lesson) return null;

  const unlockMap = await getSequentialModuleUnlockMap(userId);
  const moduleUnlocked = unlockMap.get(lesson.module.id) ?? false;

  const siblings = lesson.module.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    order: l.order,
    estimatedTime: l.estimatedTime,
    completed: l.progress[0]?.completed ?? false,
  }));
  const index = siblings.findIndex((l) => l.id === lesson.id);
  const withAccess = siblings.map((l, i) => ({
    ...l,
    isUnlocked: moduleUnlocked && siblings.slice(0, i).every((p) => p.completed),
  }));
  const inSequence = withAccess[index]?.isUnlocked ?? false;

  const drills: LessonDrill[] = lesson.exercises.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    difficulty: e.difficulty,
    type: e.type,
    xpReward: e.xpReward,
    required: e.required,
    passed: e.submissions.some((s) => s.passed),
    attempted: e.submissions.length > 0,
  }));
  const requiredRemaining = drills.filter((d) => d.required && !d.passed).length;
  const pick = (i: number) => {
    const l = siblings[i];
    return l ? { id: l.id, title: l.title, order: l.order } : null;
  };

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    content: lesson.content,
    estimatedTime: lesson.estimatedTime,
    completed: siblings[index]?.completed ?? false,
    module: { id: lesson.module.id, title: lesson.module.title },
    moduleUnlocked,
    inSequence,
    drills,
    requiredRemaining,
    canComplete: inSequence && requiredRemaining === 0,
    lessons: withAccess,
    index,
    previous: pick(index - 1),
    next: pick(index + 1),
  };
}
