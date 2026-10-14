import { prisma } from "@/lib/prisma";
import { AUTOMATION_TRACK, getCurriculumState, PYTHON_TRACK } from "@/lib/curriculum-state";
import { estimateTrainingHours, startOfWeek } from "@/lib/pacing";
import { ordinal } from "@/lib/ranks";
import { BLACK_BELT, blackBeltIfDue } from "@/lib/black-belt";

/**
 * The learning log: one entry a week, in the shape of the roadmap's weekly
 * check-in. The facts of the current week are pre-filled from what the learner
 * actually did (lessons, drills, gradings, capstones, labs). "Learned" and
 * "Stuck on" are left for the learner to write, since putting an idea in your
 * own words is the point; the week's drill topics and unsolved drills are
 * offered beside them as prompts.
 */

export interface LogWeek {
  weekOf: string;
  /** Week number since the learner started */
  week: number;
  phase: string;
  hours: number;
  built: string;
  learned: string;
  stuck: string;
  nextGoal: string;
  question: string;
  /** False for a draft built from activity that hasn't been saved yet */
  saved: boolean;
  /** What to jog the learner's memory with, beside "Learned" and "Stuck on" (the current week only) */
  prompts?: WeekPrompts;
}

export interface WeekPrompts {
  /** Topics of the drills passed this week, most practised first */
  topics: string[];
  /** Drills tried this week and not passed since */
  unsolved: string[];
}

const WEEK_MS = 7 * 86_400_000;

function list(items: string[], max = 3): string {
  if (items.length === 0) return "";
  const shown = items.slice(0, max);
  return items.length > max ? `${shown.join(", ")} and ${items.length - max} more` : shown.join(", ");
}

/** Where the learner is, in the check-in's terms */
async function currentPhase(userId: string): Promise<{ phase: string; nextGoal: string }> {
  const tracks = await getCurriculumState(userId);
  const python = tracks.find((t) => t.slug === PYTHON_TRACK);
  const automation = tracks.find((t) => t.slug === AUTOMATION_TRACK);
  const inPython = python?.modules.find((m) => m.unlocked && !m.passed);
  const inAutomation = automation?.unlocked ? automation.modules.find((m) => m.unlocked && !m.passed) : undefined;
  // Every Python module passed, black belt not yet earned: that grading is the phase
  if (!inPython && python) {
    const bb = await blackBeltIfDue(userId, tracks);
    if (bb && !bb.met) {
      const weak = bb.topics.filter((t) => t.strength < BLACK_BELT.masteryTarget).slice(0, 2).map((t) => t.tag);
      const nextGoal =
        bb.capstones.approved < bb.capstones.needed
          ? `Get capstone ${bb.capstones.approved + 1} of ${bb.capstones.needed} approved${weak.length ? `, and keep reviewing ${weak.join(" and ")}` : ""}`
          : `Raise ${weak.join(" and ")} to 80% through reviews`;
      return { phase: "Python black belt grading", nextGoal };
    }
  }
  const current = inPython ?? inAutomation;
  if (!current) return { phase: "Finished the course", nextGoal: "Build a portfolio project with what you've learned" };

  const phase = inPython
    ? `Python module ${current.order} - ${current.title}`
    : `AI automation ${ordinal(current.order + 1)} dan - ${current.title}`;
  const nextLesson = await prisma.lesson.findFirst({
    where: { moduleId: current.id, archivedAt: null, progress: { none: { userId, completed: true } } },
    orderBy: { order: "asc" },
    select: { title: true },
  });
  const nextGoal = nextLesson
    ? `Finish "${nextLesson.title}" and keep going through ${current.title}`
    : `Pass the ${current.title} grading`;
  return { phase, nextGoal };
}

/** The week's drills: how many were passed, their topics, and the ones still unsolved */
async function weekDrills(userId: string, weekOf: Date): Promise<WeekPrompts & { passed: number }> {
  const range = { gte: weekOf, lt: new Date(weekOf.getTime() + WEEK_MS) };
  const [passed, attempted] = await Promise.all([
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: true, submittedAt: range },
      distinct: ["exerciseId"],
      select: { exerciseId: true, exercise: { select: { tags: true } } },
    }),
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: false, submittedAt: range },
      distinct: ["exerciseId"],
      select: { exerciseId: true, exercise: { select: { title: true } } },
    }),
  ]);

  // Unsolved: drills tried this week and never passed (not even later)
  const solvedIds = new Set(
    (
      await prisma.exerciseSubmission.findMany({
        where: { userId, passed: true, exerciseId: { in: attempted.map((a) => a.exerciseId) } },
        distinct: ["exerciseId"],
        select: { exerciseId: true },
      })
    ).map((s) => s.exerciseId)
  );
  const unsolved = attempted.filter((a) => !solvedIds.has(a.exerciseId)).map((a) => a.exercise.title);

  const tagCounts = new Map<string, number>();
  for (const p of passed) for (const t of new Set(p.exercise.tags.map((t) => t.toLowerCase()))) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const topics = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  return { passed: passed.length, topics, unsolved: unsolved.slice(0, 5) };
}

/** A check-in drafted from the week's activity: the facts, with prompts for what only the learner can say */
async function draftFor(userId: string, weekOf: Date): Promise<Omit<LogWeek, "week" | "saved">> {
  const until = new Date(weekOf.getTime() + WEEK_MS);
  const range = { gte: weekOf, lt: until };
  const [lessons, drills, checkpoints, capstones, labs, hours, where] = await Promise.all([
    prisma.progress.findMany({
      where: { userId, completed: true, completedAt: range },
      orderBy: { completedAt: "asc" },
      select: { lesson: { select: { title: true } } },
    }),
    weekDrills(userId, weekOf),
    prisma.checkpointAttempt.findMany({
      where: { userId, passed: true, submittedAt: range },
      select: { placement: true, module: { select: { title: true } } },
    }),
    prisma.projectSubmission.findMany({ where: { userId, submittedAt: range }, select: { project: { select: { title: true } } } }),
    prisma.labRun.findMany({ where: { userId, verifiedAt: range }, select: { lesson: { select: { lab: true, title: true } } } }),
    estimateTrainingHours(userId, weekOf, until),
    currentPhase(userId),
  ]);

  const built: string[] = [];
  if (lessons.length) built.push(`Lessons: ${list(lessons.map((l) => l.lesson.title))}`);
  if (checkpoints.length) {
    built.push(`Passed the ${list(checkpoints.map((c) => c.module.title))} grading${checkpoints.length > 1 ? "s" : ""}`);
  }
  if (capstones.length) built.push(`Submitted the capstone: ${list(capstones.map((c) => c.project.title))}`);
  if (labs.length) {
    built.push(`Lab${labs.length > 1 ? "s" : ""}: ${list(labs.map((l) => (l.lesson.lab as { title?: string } | null)?.title ?? l.lesson.title))}`);
  }
  if (drills.passed) built.push(`${drills.passed} ${drills.passed === 1 ? "drill" : "drills"} passed`);

  return {
    weekOf: weekOf.toISOString(),
    phase: where.phase,
    hours,
    built: built.join("\n"),
    learned: "",
    stuck: "",
    nextGoal: where.nextGoal,
    question: "",
    prompts: { topics: drills.topics, unsolved: drills.unsolved },
  };
}

async function weekNumber(userId: string, weekOf: Date): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { onboardedAt: true, createdAt: true } });
  const started = startOfWeek(user?.onboardedAt ?? user?.createdAt ?? new Date());
  return Math.max(1, Math.floor((weekOf.getTime() - started.getTime()) / WEEK_MS) + 1);
}

/** This week's check-in: the saved entry if there is one, otherwise a draft from activity */
export async function getCurrentWeek(userId: string): Promise<LogWeek> {
  const weekOf = startOfWeek();
  const [saved, week] = await Promise.all([
    prisma.learningLogEntry.findUnique({ where: { userId_weekOf: { userId, weekOf } } }),
    weekNumber(userId, weekOf),
  ]);
  if (saved) {
    const [phase, { topics, unsolved }] = await Promise.all([
      saved.phase || currentPhase(userId).then((p) => p.phase),
      weekDrills(userId, weekOf),
    ]);
    return { ...pick(saved), weekOf: weekOf.toISOString(), week, phase, saved: true, prompts: { topics, unsolved } };
  }
  return { ...(await draftFor(userId, weekOf)), week, saved: false };
}

/** Pre-filled values only (for "Refill from this week's activity") */
export async function getWeekDraft(userId: string): Promise<LogWeek> {
  const weekOf = startOfWeek();
  return { ...(await draftFor(userId, weekOf)), week: await weekNumber(userId, weekOf), saved: false };
}

function pick(e: { hours: number; built: string; learned: string; stuck: string; nextGoal: string; question: string }) {
  return { hours: e.hours, built: e.built, learned: e.learned, stuck: e.stuck, nextGoal: e.nextGoal, question: e.question };
}

export async function getPastWeeks(userId: string, limit = 26): Promise<LogWeek[]> {
  const entries = await prisma.learningLogEntry.findMany({
    where: { userId, weekOf: { lt: startOfWeek() } },
    orderBy: { weekOf: "desc" },
    take: limit,
  });
  return Promise.all(
    entries.map(async (e) => ({
      ...pick(e),
      weekOf: e.weekOf.toISOString(),
      week: await weekNumber(userId, e.weekOf),
      phase: e.phase,
      saved: true,
    }))
  );
}

export async function saveCurrentWeek(
  userId: string,
  data: { hours: number; built: string; learned: string; stuck: string; nextGoal: string; question: string }
) {
  const weekOf = startOfWeek();
  const { phase } = await currentPhase(userId);
  return prisma.learningLogEntry.upsert({
    where: { userId_weekOf: { userId, weekOf } },
    create: { userId, weekOf, phase, ...data },
    update: { ...data, phase },
  });
}
