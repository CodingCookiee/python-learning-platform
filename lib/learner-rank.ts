import { prisma } from "@/lib/prisma";
import { rankFor, type Rank } from "@/lib/ranks";

export interface LearnerRank extends Rank {
  modulesPassed: number;
  /** The module whose grading earns the next stripe (null at black belt) */
  nextModule: {
    id: string;
    order: number;
    title: string;
    lessonsDone: number;
    lessonsTotal: number;
  } | null;
}

/**
 * A learner's current rank: modules passed in curriculum order.
 * A module counts as passed when all its lessons are complete (module
 * gradings replace this rule once checkpoints ship).
 */
export async function getLearnerRank(userId: string): Promise<LearnerRank> {
  const [modules, completed] = await Promise.all([
    prisma.module.findMany({
      orderBy: { order: "asc" },
      select: { id: true, order: true, title: true, lessons: { select: { id: true } } },
    }),
    prisma.progress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    }),
  ]);

  const done = new Set(completed.map((p) => p.lessonId));
  let modulesPassed = 0;
  for (const m of modules) {
    const passed = m.lessons.length > 0 && m.lessons.every((l) => done.has(l.id));
    if (!passed) break;
    modulesPassed++;
  }

  const next = modules[modulesPassed];
  return {
    ...rankFor(modulesPassed),
    modulesPassed,
    nextModule: next
      ? {
          id: next.id,
          order: next.order,
          title: next.title,
          lessonsDone: next.lessons.filter((l) => done.has(l.id)).length,
          lessonsTotal: next.lessons.length,
        }
      : null,
  };
}
