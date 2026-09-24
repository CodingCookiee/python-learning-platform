import { prisma } from "@/lib/prisma";
import { rankFor, type Rank } from "@/lib/ranks";

/**
 * A learner's current rank: modules passed in curriculum order.
 * A module counts as passed when all its lessons are complete (module
 * gradings replace this rule once checkpoints ship).
 */
export async function getLearnerRank(userId: string): Promise<Rank & { modulesPassed: number }> {
  const [modules, completed] = await Promise.all([
    prisma.module.findMany({
      orderBy: { order: "asc" },
      select: { lessons: { select: { id: true } } },
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

  return { ...rankFor(modulesPassed), modulesPassed };
}
