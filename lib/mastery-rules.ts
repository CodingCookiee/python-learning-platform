/**
 * The rules behind checkpoints and spaced review, kept free of database access so
 * curriculum state, the APIs and the pages all agree on them.
 */

// Checkpoints

/** Minutes a checkpoint allows per drill it draws */
export const CHECKPOINT_MINUTES_PER_DRILL = 20;
/** Wait after a failed checkpoint before a fresh draw */
export const CHECKPOINT_RETRY_MINUTES = 30;
/** XP for passing a module's checkpoint the first time */
export const CHECKPOINT_XP = 100;

interface DrillShape {
  slug: string | null;
  difficulty: string;
  type: string;
}

/**
 * Whether a drill can be drawn for its module's checkpoint. An explicit pool in
 * module.yaml wins; otherwise core and stretch drills that ask the learner to
 * write code (a predict drill's answer is too easy to remember).
 */
export function inCheckpointPool(drill: DrillShape, pool: string[]): boolean {
  if (pool.length > 0) return drill.slug !== null && pool.includes(drill.slug);
  return drill.difficulty !== "warm-up" && drill.type !== "predict";
}

export function checkpointDeadline(startedAt: Date, drillCount: number): Date {
  return new Date(startedAt.getTime() + drillCount * CHECKPOINT_MINUTES_PER_DRILL * 60_000);
}

export function checkpointScore(exerciseIds: string[], passedIds: string[]): number {
  if (exerciseIds.length === 0) return 0;
  const drawn = new Set(exerciseIds);
  return new Set(passedIds.filter((id) => drawn.has(id))).size / drawn.size;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Draw `pick` drills spread across the module's lessons: shuffle within each lesson,
 * then take one per lesson in turn, so no single lesson dominates the exam.
 */
export function drawCheckpoint<T extends { id: string; lessonId: string }>(pool: T[], pick: number): T[] {
  const byLesson = new Map<string, T[]>();
  for (const d of pool) byLesson.set(d.lessonId, [...(byLesson.get(d.lessonId) ?? []), d]);
  const queues = shuffle([...byLesson.values()].map(shuffle));
  const drawn: T[] = [];
  while (drawn.length < pick && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) drawn.push(next);
      if (drawn.length >= pick) break;
    }
  }
  return drawn;
}

// Spaced review

/** Days until the next review, by stage. A lapse sends a drill back to stage 0. */
export const REVIEW_INTERVALS = [1, 3, 7, 21, 60, 120] as const;
export const REVIEW_MAX_STAGE = REVIEW_INTERVALS.length - 1;
/** XP for a due review passed without hints */
export const REVIEW_XP = 5;
/** Most reviews offered in one day, so a backlog never turns into a wall */
export const REVIEW_DAILY_LIMIT = 12;

/** Drills worth recalling later: the same shape as the default checkpoint pool */
export function reviewEligible(drill: { difficulty: string; type: string }): boolean {
  return drill.difficulty !== "warm-up" && drill.type !== "predict";
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86_400_000);
}

/**
 * The schedule after a due review. A clean pass moves up a stage; a pass that
 * needed hints stays at its stage and comes back tomorrow; a fail starts over.
 */
export function nextReview(
  item: { stage: number; lapses: number },
  outcome: { passed: boolean; hintsUsed: number },
  now = new Date()
): { stage: number; lapses: number; dueAt: Date } {
  if (!outcome.passed) return { stage: 0, lapses: item.lapses + 1, dueAt: addDays(now, REVIEW_INTERVALS[0]) };
  if (outcome.hintsUsed > 0) return { stage: item.stage, lapses: item.lapses, dueAt: addDays(now, 1) };
  const stage = Math.min(item.stage + 1, REVIEW_MAX_STAGE);
  return { stage, lapses: item.lapses, dueAt: addDays(now, REVIEW_INTERVALS[stage]) };
}

/**
 * How firmly a drill is held, 0 to 1: solving it is worth 0.4, and each review
 * stage survived adds the rest. Used by the skill map.
 */
export function drillStrength(solved: boolean, stage: number | null): number {
  if (!solved) return 0;
  return 0.4 + 0.6 * (Math.min(stage ?? 0, REVIEW_MAX_STAGE) / REVIEW_MAX_STAGE);
}
