import { prisma } from "@/lib/prisma";
import { getSequentialModuleUnlockMap } from "@/lib/module-access";
import { openAttemptForDrill } from "@/lib/checkpoint";
import { getReviewState } from "@/lib/review";
import { checkpointDeadline } from "@/lib/mastery-rules";

/** Attempts after which the reference solution can be revealed without solving */
export const SOLUTION_AFTER_ATTEMPTS = 3;

export type DrillType = "function" | "program" | "predict" | "fix" | "refactor" | "tests";

/**
 * How the drill is being attempted.
 * - practice: the normal drill page, hints and (earned) solution available
 * - review: a spaced-review recall from a blank starter, no solution
 * - checkpoint: part of an open module checkpoint, no hints and no solution
 */
export type DrillMode =
  | { kind: "practice" }
  | { kind: "review"; due: boolean; stage: number; reviews: number; dueAt: string }
  | {
      kind: "checkpoint";
      attemptId: string;
      moduleId: string;
      deadline: string;
      passed: boolean;
      passedCount: number;
      total: number;
    };

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
  /** False for script-style drills: tests run the code rather than import it */
  importSolution: boolean;
  hints: string[];
  testList: Array<{ name: string; hidden: boolean }>;
  /** Only when solved, or after SOLUTION_AFTER_ATTEMPTS attempts */
  solution: string | null;
  lesson: { id: string; title: string };
  module: { id: string; title: string };
  stats: { attempts: number; solved: boolean };
  mode: DrillMode;
  /** The learner's autosaved practice code, if any */
  draft: { code: string; savedAt: string } | null;
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
 * or sits in a module the learner hasn't unlocked. A drill inside an open
 * checkpoint is always served in checkpoint mode, whatever was asked for.
 */
export async function getDrillForUser(
  id: string,
  userId: string,
  requested: "practice" | "review" = "practice"
): Promise<DrillData | null> {
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

  const [unlockMap, attempts, solved, checkpoint, review, draft] = await Promise.all([
    getSequentialModuleUnlockMap(userId),
    prisma.exerciseSubmission.count({ where: { userId, exerciseId: id, mode: "practice" } }),
    prisma.exerciseSubmission.findFirst({ where: { userId, exerciseId: id, passed: true }, select: { id: true } }),
    openAttemptForDrill(userId, id),
    requested === "review" ? getReviewState(userId, id) : Promise.resolve(null),
    prisma.drillDraft.findUnique({ where: { userId_exerciseId: { userId, exerciseId: id } } }),
  ]);
  if (!unlockMap.get(exercise.lesson.module.id)) return null;

  let mode: DrillMode = { kind: "practice" };
  let siblings: Array<{ id: string; title: string }> = exercise.lesson.exercises;
  if (checkpoint) {
    const drawn = new Set(checkpoint.exerciseIds);
    const passedIds = new Set(checkpoint.passedIds.filter((p) => drawn.has(p)));
    mode = {
      kind: "checkpoint",
      attemptId: checkpoint.id,
      moduleId: checkpoint.moduleId,
      deadline: checkpointDeadline(checkpoint.startedAt, checkpoint.exerciseIds.length).toISOString(),
      passed: passedIds.has(id),
      passedCount: passedIds.size,
      total: drawn.size,
    };
    const titles = await prisma.exercise.findMany({
      where: { id: { in: checkpoint.exerciseIds } },
      select: { id: true, title: true },
    });
    const byId = new Map(titles.map((t) => [t.id, t]));
    siblings = checkpoint.exerciseIds.flatMap((e) => (byId.has(e) ? [byId.get(e)!] : []));
  } else if (review) {
    mode = { kind: "review", ...review };
  }
  const exam = mode.kind !== "practice";

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
    importSolution: exercise.importSolution,
    hints: mode.kind === "checkpoint" ? [] : parseJsonArray<string>(exercise.hints).map(String),
    testList: parseJsonArray<{ name: string; hidden: boolean }>(exercise.testCases).filter(
      (t) => typeof t?.name === "string"
    ),
    solution: !exam && (solved || attempts >= SOLUTION_AFTER_ATTEMPTS) ? exercise.solution : null,
    lesson: { id: exercise.lesson.id, title: exercise.lesson.title },
    module: exercise.lesson.module,
    stats: { attempts, solved: Boolean(solved) },
    mode,
    // Drafts are practice code; reviews and checkpoints start from the starter
    draft: mode.kind === "practice" && draft ? { code: draft.code, savedAt: draft.updatedAt.toISOString() } : null,
    position: { index: Math.max(0, index), total: siblings.length },
    // A review stands alone; a checkpoint steps through its own drills
    previous: mode.kind !== "review" && index > 0 ? siblings[index - 1]! : null,
    next: mode.kind !== "review" && index >= 0 && index < siblings.length - 1 ? siblings[index + 1]! : null,
  };
}
