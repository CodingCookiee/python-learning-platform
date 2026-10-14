import { prisma } from "@/lib/prisma";
import { getCurriculumState, indexModules, PYTHON_TRACK, trackGrade, type TrackProgress } from "@/lib/curriculum-state";
import { BELTS, beltForModule, type BeltKey } from "@/lib/ranks";
import {
  checkAndUnlockAchievements,
  updateStreak,
  updateUserLevel,
  type UnlockedAchievement,
} from "@/lib/achievements";
import {
  BELT_DRILLS_PER_MODULE,
  BELT_TEST_OUT_MIN_MODULES,
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
 *
 * A belt test-out is one grading for the rest of a belt: a couple of drills from
 * each module still to pass, in one sitting. Passing it passes all of them.
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
  /** A belt test-out: the belt and the modules it covers */
  belt: { key: BeltKey; label: string; modules: Array<{ id: string; title: string; order: number }> } | null;
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
      track: { select: { grade: true } },
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
  // No checkpoint in a track with no grade (the Start on-ramp), as in lib/curriculum-state.ts
  const pool =
    mod.track && trackGrade(mod.track.grade) === "none"
      ? []
      : mod.lessons.flatMap((l) => l.exercises).filter((e) => inCheckpointPool(e, mod.checkpointPool));
  return { pool, pick: Math.min(mod.checkpointPick, pool.length), passMark: mod.checkpointPassMark };
}

/** Close an attempt: score it, and on a first pass award the checkpoint XP. Idempotent. */
async function finish(attemptId: string, userId: string): Promise<CheckpointResult | null> {
  const attempt = await prisma.checkpointAttempt.findFirst({ where: { id: attemptId, userId } });
  if (!attempt) return null;
  if (attempt.submittedAt) {
    return { score: attempt.score ?? 0, passed: attempt.passed, xpGained: 0, achievements: [] };
  }

  const covers = coveredModules(attempt);
  const score = checkpointScore(attempt.exerciseIds, attempt.passedIds);
  // A small epsilon so 4 of 5 meets a 0.8 mark
  const passed = score + 1e-9 >= (await passMarkFor(covers));
  // The modules this pass passes for the first time: each earns the grading XP once
  const earlier = passed ? await passedModuleIds(userId, covers) : new Set<string>();
  const newlyPassed = passed ? covers.filter((id) => !earlier.has(id)) : [];

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
  if (newlyPassed.length > 0) {
    xpGained = CHECKPOINT_XP * newlyPassed.length;
    await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xpGained } } });
    await updateUserLevel(userId);
    await updateStreak(userId);
    // Passing a checkpoint passes the module, which can earn module patches
    achievements.push(...(await checkAndUnlockAchievements(userId)));
  }
  return { score, passed, xpGained, achievements };
}

/** The modules an attempt passes: a belt test-out's list, or its own module */
function coveredModules(attempt: { moduleId: string; coversModuleIds: string[] }): string[] {
  return attempt.coversModuleIds.length > 0 ? attempt.coversModuleIds : [attempt.moduleId];
}

/** The mark to pass: the module's own, or the strictest of the modules a belt test-out covers */
async function passMarkFor(moduleIds: string[]): Promise<number> {
  const mods = await prisma.module.findMany({ where: { id: { in: moduleIds } }, select: { checkpointPassMark: true } });
  return mods.length > 0 ? Math.max(...mods.map((m) => m.checkpointPassMark)) : 0.8;
}

/** Which of these modules the learner had already passed, by any grading */
async function passedModuleIds(userId: string, moduleIds: string[]): Promise<Set<string>> {
  const passedBefore = await prisma.checkpointAttempt.findMany({
    where: {
      userId,
      passed: true,
      OR: [{ moduleId: { in: moduleIds } }, { coversModuleIds: { hasSome: moduleIds } }],
    },
    select: { moduleId: true, coversModuleIds: true },
  });
  return new Set(passedBefore.flatMap((a) => coveredModules(a)).filter((id) => moduleIds.includes(id)));
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
      where: { userId, moduleId, belt: null },
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
      return { ok: false, status: 409, error: "This module has no grading; finishing its lessons passes it." };
    case "passed":
      return { ok: false, status: 409, error: "You've already passed this grading." };
    case "locked":
      return { ok: false, status: 403, error: "Pass the earlier modules first." };
    case "cooldown":
      return { ok: false, status: 429, error: "Take a break before the next attempt; a fresh set of drills will be ready soon." };
  }

  const data = await modulePool(moduleId);
  if (!data || data.pick === 0) return { ok: false, status: 409, error: "This module has no grading." };
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
    include: { module: { select: { id: true, title: true, order: true } } },
  });
  if (!attempt) return null;
  const covers = coveredModules(attempt);
  const [passMark, beltModules] = await Promise.all([
    passMarkFor(covers),
    attempt.belt
      ? prisma.module.findMany({ where: { id: { in: covers } }, orderBy: { order: "asc" }, select: { id: true, title: true, order: true } })
      : Promise.resolve([]),
  ]);
  const beltInfo = attempt.belt ? BELTS.find((b) => b.key === attempt.belt) : undefined;

  const exercises = await prisma.exercise.findMany({
    where: { id: { in: attempt.exerciseIds } },
    select: { id: true, title: true, type: true, difficulty: true, tags: true, lesson: { select: { id: true, title: true } } },
  });
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const passed = new Set(attempt.passedIds);
  return {
    id: attempt.id,
    module: { id: attempt.module.id, title: attempt.module.title, order: attempt.module.order },
    belt: beltInfo ? { key: beltInfo.key, label: beltInfo.label, modules: beltModules } : null,
    placement: attempt.placement,
    passMark,
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
    return { ok: false, status: 404, error: "That drill isn't part of this grading." };
  }
  if (attempt.submittedAt) return { ok: false, status: 409, error: "This grading has already been handed in." };
  if (checkpointDeadline(attempt.startedAt, attempt.exerciseIds.length).getTime() <= Date.now()) {
    await finish(attempt.id, userId);
    return { ok: false, status: 409, error: "Time's up on this grading." };
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

// Belt test-outs

export interface BeltTestOut {
  belt: { key: BeltKey; label: string };
  /** The modules it would pass: the belt's modules not passed yet, in order */
  modules: Array<{ id: string; title: string; order: number }>;
  drills: number;
  minutes: number;
  passMark: number;
  status: "available" | "open" | "cooldown";
  openAttemptId: string | null;
  retryAt: string | null;
}

/**
 * The belt test-out on offer from a module's page: the rest of the module's (Python) belt in one
 * grading. Offered once the belt is reached (its first unpassed module is open) while at least two of
 * its modules are still to pass; null otherwise.
 */
export async function getBeltTestOut(userId: string, moduleId: string, tracks?: TrackProgress[]): Promise<BeltTestOut | null> {
  const state = tracks ?? (await getCurriculumState(userId));
  const python = state.find((t) => t.slug === PYTHON_TRACK);
  const mod = python?.modules.find((m) => m.id === moduleId);
  if (!python || !mod) return null;
  const belt = beltForModule(mod.order);
  const left = python.modules.filter(
    (m) => m.order >= belt.fromModule && m.order <= belt.toModule && !m.passed && m.checkpoint.poolSize > 0
  );
  if (left.length < BELT_TEST_OUT_MIN_MODULES || !left[0]!.unlocked) return null;

  await closeExpiredBelt(userId, belt.key);
  const attempts = await prisma.checkpointAttempt.findMany({
    where: { userId, belt: belt.key },
    orderBy: { startedAt: "desc" },
    select: { id: true, submittedAt: true, passed: true },
  });
  const open = attempts.find((a) => !a.submittedAt) ?? null;
  const lastClosed = attempts.find((a) => a.submittedAt) ?? null;
  const retryAt =
    lastClosed && !lastClosed.passed ? new Date(lastClosed.submittedAt!.getTime() + CHECKPOINT_RETRY_MINUTES * 60_000) : null;
  const cooling = retryAt !== null && retryAt.getTime() > Date.now();

  const drills = left.reduce((n, m) => n + Math.min(BELT_DRILLS_PER_MODULE, m.checkpoint.poolSize), 0);
  return {
    belt: { key: belt.key, label: belt.label },
    modules: left.map((m) => ({ id: m.id, title: m.title, order: m.order })),
    drills,
    minutes: drills * CHECKPOINT_MINUTES_PER_DRILL,
    passMark: Math.max(...left.map((m) => m.checkpoint.passMark)),
    status: open ? "open" : cooling ? "cooldown" : "available",
    openAttemptId: open?.id ?? null,
    retryAt: cooling && !open ? retryAt!.toISOString() : null,
  };
}

async function closeExpiredBelt(userId: string, belt: BeltKey) {
  const open = await prisma.checkpointAttempt.findMany({
    where: { userId, belt, submittedAt: null },
    select: { id: true, startedAt: true, exerciseIds: true },
  });
  const now = Date.now();
  for (const a of open) {
    if (checkpointDeadline(a.startedAt, a.exerciseIds.length).getTime() <= now) await finish(a.id, userId);
  }
}

/** Start (or resume) the belt test-out offered from this module's page. */
export async function startBeltTestOut(userId: string, moduleId: string): Promise<StartResult> {
  const offer = await getBeltTestOut(userId, moduleId);
  if (!offer) return { ok: false, status: 409, error: "There's no belt test-out to take from here." };
  if (offer.status === "open") return { ok: true, attemptId: offer.openAttemptId! };
  if (offer.status === "cooldown") {
    return { ok: false, status: 429, error: "Take a break before the next attempt; a fresh set of drills will be ready soon." };
  }

  const drawn: string[] = [];
  for (const m of offer.modules) {
    const data = await modulePool(m.id);
    if (!data) continue;
    drawn.push(...drawCheckpoint(data.pool, Math.min(BELT_DRILLS_PER_MODULE, data.pool.length)).map((d) => d.id));
  }
  if (drawn.length === 0) return { ok: false, status: 409, error: "This belt has no drills to draw." };
  const attempt = await prisma.checkpointAttempt.create({
    data: {
      userId,
      moduleId: offer.modules[0]!.id,
      belt: offer.belt.key,
      coversModuleIds: offer.modules.map((m) => m.id),
      exerciseIds: drawn,
      placement: true,
    },
  });
  return { ok: true, attemptId: attempt.id };
}
