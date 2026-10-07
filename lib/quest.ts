import { prisma } from "@/lib/prisma";
import { checkAndUnlockAchievements, type UnlockedAchievement } from "@/lib/achievements";
import {
  BUG_DRILLS,
  BROWSER_STEPS,
  currentStep,
  FIRST_SESSION,
  firstLessonSlug,
  isBugDrill,
  QUEST_BADGE,
  questPath,
  STEPS,
  type QuestPath,
  type QuestView,
  type StepKey,
} from "@/lib/quest-steps";

export * from "@/lib/quest-steps";

/**
 * The first-session quest: five real actions in a learner's first lesson, guided by the sensei
 * (docs/superpowers/specs/2026-10-07-first-session-quest-design.md). Progress is kept per learner
 * in QuestProgress. Three steps are reported by the browser, two are recorded where drill passes
 * are. The quest guides; it never gates anything or changes rank. The steps and lines live in
 * lib/quest-steps.ts so the panel can use them.
 */

/** Where each step happens for this learner's path */
async function stepLinks(path: QuestPath): Promise<Record<StepKey, string>> {
  const lesson = await prisma.lesson.findFirst({
    where: { slug: firstLessonSlug(path), archivedAt: null },
    select: { id: true, exercises: { where: { archivedAt: null }, orderBy: { order: "asc" }, take: 1, select: { id: true } } },
  });
  const bug = await prisma.exercise.findFirst({ where: { slug: BUG_DRILLS[path], archivedAt: null }, select: { id: true } });
  const lessonHref = lesson ? `/lessons/${lesson.id}` : "/modules";
  return {
    "run-code": lessonHref,
    scratchpad: lessonHref,
    "first-drill": lesson?.exercises[0] ? `/exercises/${lesson.exercises[0].id}` : lessonHref,
    "fix-bug": bug ? `/exercises/${bug.id}` : lessonHref,
    progress: "/dashboard",
  };
}

const known = (keys: string[]): StepKey[] => STEPS.map((s) => s.key).filter((k) => keys.includes(k));

/** The learner's quest for the panel, or null if they've never started (or declined) it */
export async function getQuest(userId: string, quest = FIRST_SESSION): Promise<QuestView | null> {
  const [row, user] = await Promise.all([
    prisma.questProgress.findUnique({ where: { userId_quest: { userId, quest } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { experience: true } }),
  ]);
  if (!row) return null;
  const path = questPath(user?.experience);
  const completed = known(row.completed);
  const links = await stepLinks(path);
  const finished = row.finishedAt !== null;
  const reward = finished
    ? await prisma.achievement.findUnique({ where: { slug: QUEST_BADGE }, select: { xpReward: true } })
    : null;
  const skipped = row.skippedAt !== null && !finished;
  return {
    quest,
    path,
    completed,
    current: finished ? null : (currentStep(completed)?.key ?? null),
    active: !finished && !skipped,
    finished,
    skipped,
    steps: STEPS.map((s) => ({ ...s, done: completed.includes(s.key), href: links[s.key] })),
    rewardXp: reward?.xpReward ?? null,
  };
}

/** Steps an existing learner's history already shows: a passed drill, a fixed bug */
async function historySteps(userId: string): Promise<StepKey[]> {
  const passed = await prisma.exerciseSubmission.findMany({
    where: { userId, passed: true, exercise: { archivedAt: null } },
    distinct: ["exerciseId"],
    select: { exercise: { select: { slug: true, type: true } } },
  });
  const steps: StepKey[] = [];
  if (passed.length > 0) steps.push("first-drill");
  if (passed.some((p) => isBugDrill(p.exercise))) steps.push("fix-bug");
  return steps;
}

/** Start the quest (once); drill steps the learner's history already covers are ticked */
export async function startQuest(userId: string, quest = FIRST_SESSION): Promise<QuestView | null> {
  const existing = await prisma.questProgress.findUnique({ where: { userId_quest: { userId, quest } } });
  if (!existing) {
    await prisma.questProgress.create({ data: { userId, quest, completed: await historySteps(userId) } });
  }
  return getQuest(userId, quest);
}

export interface StepResult {
  view: QuestView | null;
  /** Achievements this step unlocked (Ready to Train when it finishes the quest) */
  achievements: UnlockedAchievement[];
}

/** Record a step on an active quest. The fifth step finishes it and awards Ready to Train. */
export async function recordStep(userId: string, key: StepKey, quest = FIRST_SESSION): Promise<StepResult> {
  const row = await prisma.questProgress.findUnique({ where: { userId_quest: { userId, quest } } });
  if (!row || row.finishedAt || row.skippedAt || row.completed.includes(key)) {
    return { view: row ? await getQuest(userId, quest) : null, achievements: [] };
  }
  const completed = known([...row.completed, key]);
  const finishing = completed.length === STEPS.length;
  // Only the request that actually adds the step (and, at the end, finishes the quest) wins
  const { count } = await prisma.questProgress.updateMany({
    where: { id: row.id, finishedAt: null, NOT: { completed: { has: key } } },
    data: { completed: { push: key }, ...(finishing ? { finishedAt: new Date() } : {}) },
  });
  const achievements = count > 0 && finishing ? await checkAndUnlockAchievements(userId) : [];
  return { view: await getQuest(userId, quest), achievements };
}

/** A drill passed: the first-drill step, and fix-bug for a bug drill. Never throws. */
export async function recordDrillPass(userId: string, drill: { slug: string | null; type: string }): Promise<UnlockedAchievement[]> {
  try {
    const first = await recordStep(userId, "first-drill");
    const bug = isBugDrill(drill) ? await recordStep(userId, "fix-bug") : { achievements: [] };
    return [...first.achievements, ...bug.achievements];
  } catch (error) {
    console.error("Quest step from a drill pass failed:", error);
    return [];
  }
}

/** Skip the quest, or decline it ("No thanks") when it was never started */
export async function skipQuest(userId: string, quest = FIRST_SESSION): Promise<QuestView | null> {
  await prisma.questProgress.upsert({
    where: { userId_quest: { userId, quest } },
    create: { userId, quest, completed: [], skippedAt: new Date() },
    update: { skippedAt: new Date() },
  });
  return getQuest(userId, quest);
}

export async function resumeQuest(userId: string, quest = FIRST_SESSION): Promise<QuestView | null> {
  await prisma.questProgress.updateMany({ where: { userId, quest, finishedAt: null }, data: { skippedAt: null } });
  return getQuest(userId, quest);
}

export type EventResult = ({ ok: true } & StepResult) | { ok: false; status: 400 | 409; error: string };

/** A step reported by the browser (POST /api/quest/event): only the three browser steps, only while active */
export async function questEvent(userId: string, body: unknown, quest = FIRST_SESSION): Promise<EventResult> {
  const step = (body as { step?: unknown } | null)?.step;
  if (typeof step !== "string" || !(BROWSER_STEPS as string[]).includes(step)) {
    return { ok: false, status: 400, error: "Unknown quest step." };
  }
  const view = await getQuest(userId, quest);
  if (!view?.active) return { ok: false, status: 409, error: "No quest in progress." };
  return { ok: true, ...(await recordStep(userId, step as StepKey, quest)) };
}
