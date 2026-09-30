import { prisma } from "@/lib/prisma";
import { getCurriculumState, indexModules } from "@/lib/curriculum-state";
import {
  checkAndUnlockAchievements,
  updateStreak,
  updateUserLevel,
  type UnlockedAchievement,
} from "@/lib/achievements";
import {
  CHECKPOINT_MINUTES_PER_DRILL,
  CHECKPOINT_RETRY_MINUTES,
  CHECKPOINT_XP,
  checkpointDeadline,
  checkpointScore,
  drawCheckpoint,
  inCheckpointPool,
} from "@/lib/mastery-rules";

/**
 * Checkpoints: a module's exam. An attempt draws a few drills from the module,
 * which the learner solves from a blank starter with no hints and no reference
 * solution, inside a time limit. Passing it is what passes the module (see
 * lib/curriculum-state.ts). Taken before the lessons are done, it's a placement
 * test: pass it and the module counts as passed without them.
 */

export type CheckpointStatus =
  /** The module has nothing to draw from, so it passes on its lessons */
  | "none"
  | "locked"
  /** Lessons unfinished: the checkpoint can still be taken to test out */
  | "placement"
  | "ready"
  | "open"
  | "cooldown"
  | "passed";

export interface CheckpointSummary {
  status: CheckpointStatus;
  pick: number;
  passMark: number;
  poolSize: number;
  minutes: number;
  attempts: number;
  bestScore: number | null;
  openAttemptId: string | null;
  retryAt: string | null;
  passedPlacement: boolean;
}

export interface CheckpointDrill {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  lessonTitle: string;
  lessonId: string;
  tags: string[];
  passed: boolean;
}

export interface CheckpointAttemptView {
  id: string;
  module: { id: string; title: string; order: number };
  placement: boolean;
  passMark: number;
  startedAt: string;
  deadline: string;
  submittedAt: string | null;
  score: number | null;
  passed: boolean;
  drills: CheckpointDrill[];
}

/**
 * What a closed attempt says to study: the topics of the drills that weren't
 * passed, most-missed first, and the lessons they come from.
 */
export function topicsToReview(drills: CheckpointDrill[]) {
  const missed = drills.filter((d) => !d.passed);
  const counts = new Map<string, number>();
  for (const d of missed) for (const t of new Set(d.tags.map((t) => t.toLowerCase()))) counts.set(t, (counts.get(t) ?? 0) + 1);
  const lessons = new Map<string, { id: string; title: string; drills: number }>();
  for (const d of missed) {
    const l = lessons.get(d.lessonId) ?? { id: d.lessonId, title: d.lessonTitle, drills: 0 };
    l.drills++;
    lessons.set(d.lessonId, l);
  }
  return {
    topics: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag, n]) => ({ tag, missed: n })),
    lessons: [...lessons.values()].sort((a, b) => b.drills - a.drills),
    missed,
  };
}

export interface CheckpointResult {
  score: number;
  passed: boolean;
  xpGained: number;
  achievements: UnlockedAchievement[];
}

async function modulePool(moduleId: string) {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, archivedAt: null },
    select: {
      id: true,
      checkpointPick: true,
      checkpointPassMark: true,
      checkpointPool: true,
      lessons: {
        where: { archivedAt: null },
        select: {
          exercises: {
            where: { archivedAt: null },
            select: { id: true, slug: true, difficulty: true, type: true, lessonId: true },
          },
        },
      },
    },
  });
  if (!mod) return null;
  const pool = mod.lessons.flatMap((l) => l.exercises).filter((e) => inCheckpointPool(e, mod.checkpointPool));
  return { pool, pick: Math.min(mod.checkpointPick, pool.length), passMark: mod.checkpointPassMark };
}

/** Close an attempt: score it, and on a first pass award the checkpoint XP. Idempotent. */
async function finish(attemptId: string, userId: string): Promise<CheckpointResult | null> {
  const attempt = await prisma.checkpointAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { module: { select: { checkpointPassMark: true } } },
  });
  if (!attempt) return null;
  if (attempt.submittedAt) {
    return { score: attempt.score ?? 0, passed: attempt.passed, xpGained: 0, achievements: [] };
  }

  const score = checkpointScore(attempt.exerciseIds, attempt.passedIds);
  // A small epsilon so 4 of 5 meets a 0.8 mark
  const passed = score + 1e-9 >= attempt.module.checkpointPassMark;
  const earlierPass = passed
    ? await prisma.checkpointAttempt.findFirst({
        where: { userId, moduleId: attempt.moduleId, passed: true },
        select: { id: true },
      })
    : null;

  // Only the request that actually closes the attempt awards anything
  const closed = await prisma.checkpointAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: { submittedAt: new Date(), score, passed },
  });
  if (closed.count === 0) {
    const now = await prisma.checkpointAttempt.findUnique({ where: { id: attempt.id } });
    return { score: now?.score ?? score, passed: now?.passed ?? passed, xpGained: 0, achievements: [] };
  }

  let xpGained = 0;
  const achievements: UnlockedAchievement[] = [];
  if (passed && !earlierPass) {
    xpGained = CHECKPOINT_XP;
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpGained } } });
    await updateUserLevel(userId);
    await updateStreak(userId);
    // Passing a checkpoint passes the module, which can earn module patches
    achievements.push(...(await checkAndUnlockAchievements(userId)));
  }
  return { score, passed, xpGained, achievements };
}

/** Close any of the learner's attempts for this module whose time ran out. */
async function closeExpired(userId: string, moduleId?: string) {
  const open = await prisma.checkpointAttempt.findMany({
    where: { userId, submittedAt: null, ...(moduleId ? { moduleId } : {}) },
    select: { id: true, startedAt: true, exerciseIds: true },
  });
  const now = Date.now();
  for (const a of open) {
    if (checkpointDeadline(a.startedAt, a.exerciseIds.length).getTime() <= now) await finish(a.id, userId);
  }
}

export async function getCheckpointSummary(userId: string, moduleId: string): Promise<CheckpointSummary | null> {
  await closeExpired(userId, moduleId);
  const [tracks, attempts] = await Promise.all([
    getCurriculumState(userId),
    prisma.checkpointAttempt.findMany({
      where: { userId, moduleId },
      orderBy: { startedAt: "desc" },
      select: { id: true, submittedAt: true, score: true, passed: true, placement: true, exerciseIds: true },
    }),
  ]);
  const entry = indexModules(tracks).get(moduleId);
  if (!entry) return null;
  const { module: m } = entry;
  const cp = m.checkpoint;

  const open = attempts.find((a) => !a.submittedAt) ?? null;
  const lastClosed = attempts.find((a) => a.submittedAt) ?? null;
  const scores = attempts.map((a) => a.score).filter((s): s is number => s !== null);
  const retryAt =
    lastClosed && !lastClosed.passed
      ? new Date(lastClosed.submittedAt!.getTime() + CHECKPOINT_RETRY_MINUTES * 60_000)
      : null;

  let status: CheckpointStatus;
  if (cp.poolSize === 0) status = "none";
  else if (cp.passed) status = "passed";
  else if (!m.unlocked) status = "locked";
  else if (open) status = "open";
  else if (retryAt && retryAt.getTime() > Date.now()) status = "cooldown";
  else status = m.lessonsComplete ? "ready" : "placement";

  return {
    status,
    pick: cp.pick,
    passMark: cp.passMark,
    poolSize: cp.poolSize,
    minutes: cp.pick * CHECKPOINT_MINUTES_PER_DRILL,
    attempts: attempts.filter((a) => a.submittedAt).length,
    bestScore: scores.length > 0 ? Math.max(...scores) : null,
    openAttemptId: open?.id ?? null,
    retryAt: status === "cooldown" && retryAt ? retryAt.toISOString() : null,
    passedPlacement: cp.placement,
  };
}

export type StartResult = { ok: true; attemptId: string } | { ok: false; status: number; error: string };

/** Start (or resume) the learner's checkpoint for a module. */
export async function startCheckpoint(userId: string, moduleId: string): Promise<StartResult> {
  const summary = await getCheckpointSummary(userId, moduleId);
  if (!summary) return { ok: false, status: 404, error: "Module not found" };
  switch (summary.status) {
    case "open":
      return { ok: true, attemptId: summary.openAttemptId! };
    case "none":
      return { ok: false, status: 409, error: "This module has no checkpoint; finishing its lessons passes it." };
    case "passed":
      return { ok: false, status: 409, error: "You've already passed this checkpoint." };
    case "locked":
      return { ok: false, status: 403, error: "Pass the earlier modules first." };
    case "cooldown":
      return { ok: false, status: 429, error: "Take a break before the next attempt; a fresh set of drills will be ready soon." };
  }

  const data = await modulePool(moduleId);
  if (!data || data.pick === 0) return { ok: false, status: 409, error: "This module has no checkpoint." };
  const drawn = drawCheckpoint(data.pool, data.pick);
  const attempt = await prisma.checkpointAttempt.create({
    data: {
      userId,
      moduleId,
      exerciseIds: drawn.map((d) => d.id),
      placement: summary.status === "placement",
    },
  });
  return { ok: true, attemptId: attempt.id };
}

export async function getCheckpointAttempt(userId: string, attemptId: string): Promise<CheckpointAttemptView | null> {
  const found = await prisma.checkpointAttempt.findFirst({ where: { id: attemptId, userId }, select: { id: true } });
  if (!found) return null;
  await closeExpired(userId);
  const attempt = await prisma.checkpointAttempt.findUnique({
    where: { id: attemptId },
    include: { module: { select: { id: true, title: true, order: true, checkpointPassMark: true } } },
  });
  if (!attempt) return null;

  const exercises = await prisma.exercise.findMany({
    where: { id: { in: attempt.exerciseIds } },
    select: { id: true, title: true, type: true, difficulty: true, tags: true, lesson: { select: { id: true, title: true } } },
  });
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const passed = new Set(attempt.passedIds);
  return {
    id: attempt.id,
    module: { id: attempt.module.id, title: attempt.module.title, order: attempt.module.order },
    placement: attempt.placement,
    passMark: attempt.module.checkpointPassMark,
    startedAt: attempt.startedAt.toISOString(),
    deadline: checkpointDeadline(attempt.startedAt, attempt.exerciseIds.length).toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    score: attempt.score,
    passed: attempt.passed,
    drills: attempt.exerciseIds.flatMap((id) => {
      const e = byId.get(id);
      return e
        ? [
            {
              id,
              title: e.title,
              type: e.type,
              difficulty: e.difficulty,
              lessonTitle: e.lesson.title,
              lessonId: e.lesson.id,
              tags: e.tags,
              passed: passed.has(id),
            },
          ]
        : [];
    }),
  };
}

/**
 * The open attempt a drill is part of, if any. While one is open the drill is
 * exam material: no hints, no solution, wherever it's opened.
 */
export async function openAttemptForDrill(userId: string, exerciseId: string) {
  const attempts = await prisma.checkpointAttempt.findMany({
    where: { userId, submittedAt: null, exerciseIds: { has: exerciseId } },
    select: { id: true, startedAt: true, exerciseIds: true, passedIds: true, moduleId: true },
  });
  const now = Date.now();
  return attempts.find((a) => checkpointDeadline(a.startedAt, a.exerciseIds.length).getTime() > now) ?? null;
}

export type CheckpointSubmitResult =
  | { ok: true; passedCount: number; total: number; finished: CheckpointResult | null }
  | { ok: false; status: number; error: string };

/** Record a drill run inside an attempt; the attempt closes itself once every drill passes. */
export async function recordCheckpointRun(
  userId: string,
  attemptId: string,
  exerciseId: string,
  passed: boolean
): Promise<CheckpointSubmitResult> {
  const attempt = await prisma.checkpointAttempt.findFirst({ where: { id: attemptId, userId } });
  if (!attempt || !attempt.exerciseIds.includes(exerciseId)) {
    return { ok: false, status: 404, error: "That drill isn't part of this checkpoint." };
  }
  if (attempt.submittedAt) return { ok: false, status: 409, error: "This checkpoint has already been handed in." };
  if (checkpointDeadline(attempt.startedAt, attempt.exerciseIds.length).getTime() <= Date.now()) {
    await finish(attempt.id, userId);
    return { ok: false, status: 409, error: "Time's up on this checkpoint." };
  }

  let passedIds = attempt.passedIds;
  if (passed && !passedIds.includes(exerciseId)) {
    const updated = await prisma.checkpointAttempt.update({
      where: { id: attempt.id },
      data: { passedIds: { push: exerciseId } },
      select: { passedIds: true },
    });
    passedIds = updated.passedIds;
  }
  const passedCount = new Set(passedIds.filter((id) => attempt.exerciseIds.includes(id))).size;
  const finished = passedCount === attempt.exerciseIds.length ? await finish(attempt.id, userId) : null;
  return { ok: true, passedCount, total: attempt.exerciseIds.length, finished };
}

export async function handInCheckpoint(userId: string, attemptId: string): Promise<CheckpointResult | null> {
  return finish(attemptId, userId);
}
