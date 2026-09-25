import { prisma } from "@/lib/prisma";
import { getSequentialModuleUnlockMap } from "@/lib/module-access";

/** Attempts after which the reference solution can be revealed without solving */
export const SOLUTION_AFTER_ATTEMPTS = 3;

export type DrillType = "function" | "program" | "predict" | "fix" | "refactor" | "tests";

export interface DrillData {
  id: string;
  title: string;
  type: DrillType;
  difficulty: string;
  xpReward: number;
  required: boolean;
  instructions: string;
  starterCode: string;
  tests: string;
  packages: string[];
  timeoutMs: number;
  hints: string[];
  testList: Array<{ name: string; hidden: boolean }>;
  /** Only when solved, or after SOLUTION_AFTER_ATTEMPTS attempts */
  solution: string | null;
  lesson: { id: string; title: string };
  module: { id: string; title: string };
  stats: { attempts: number; solved: boolean };
  position: { index: number; total: number };
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}

function parseJsonArray<T>(text: string): T[] {
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const DRILL_TYPES = new Set(["function", "program", "predict", "fix", "refactor", "tests"]);

/**
 * A drill as the learner sees it, or null if it doesn't exist, is archived,
 * or sits in a module the learner hasn't unlocked.
 */
export async function getDrillForUser(id: string, userId: string): Promise<DrillData | null> {
  const exercise = await prisma.exercise.findFirst({
    where: { id, archivedAt: null, lesson: { archivedAt: null, module: { archivedAt: null } } },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          module: { select: { id: true, title: true } },
          exercises: {
            where: { archivedAt: null },
            orderBy: { order: "asc" },
            select: { id: true, title: true },
          },
        },
      },
    },
  });
  if (!exercise) return null;

  const [unlockMap, attempts, solved] = await Promise.all([
    getSequentialModuleUnlockMap(userId),
    prisma.exerciseSubmission.count({ where: { userId, exerciseId: id } }),
    prisma.exerciseSubmission.findFirst({ where: { userId, exerciseId: id, passed: true }, select: { id: true } }),
  ]);
  if (!unlockMap.get(exercise.lesson.module.id)) return null;

  const siblings = exercise.lesson.exercises;
  const index = siblings.findIndex((s) => s.id === id);

  return {
    id: exercise.id,
    title: exercise.title,
    type: (DRILL_TYPES.has(exercise.type) ? exercise.type : "function") as DrillType,
    difficulty: exercise.difficulty,
    xpReward: exercise.xpReward,
    required: exercise.required,
    instructions: exercise.instructions,
    starterCode: exercise.starterCode,
    tests: exercise.tests,
    packages: exercise.packages,
    timeoutMs: exercise.timeoutMs,
    hints: parseJsonArray<string>(exercise.hints).map(String),
    testList: parseJsonArray<{ name: string; hidden: boolean }>(exercise.testCases).filter(
      (t) => typeof t?.name === "string"
    ),
    solution: solved || attempts >= SOLUTION_AFTER_ATTEMPTS ? exercise.solution : null,
    lesson: { id: exercise.lesson.id, title: exercise.lesson.title },
    module: exercise.lesson.module,
    stats: { attempts, solved: Boolean(solved) },
    position: { index: Math.max(0, index), total: siblings.length },
    previous: index > 0 ? siblings[index - 1]! : null,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1]! : null,
  };
}
