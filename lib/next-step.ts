import { prisma } from "@/lib/prisma";
import { CHECKPOINT_MINUTES_PER_DRILL, checkpointDeadline } from "@/lib/mastery-rules";
import type { SyllabusModule } from "@/lib/syllabus";

/**
 * The one thing a learner should do next, for the top of the dashboard (2026-10-12 critique: the
 * dashboard had nine sections and no single next action). In order: drills due for review, a
 * checkpoint in progress, a checkpoint that's due, then the exact drill or lesson in front of them.
 * The quest offer and the beginner on-ramp, when they apply, take the slot on the page itself.
 */
export type NextStep =
  | { kind: "reviews"; count: number }
  | { kind: "checkpoint-open"; attemptId: string; moduleOrder: number; moduleTitle: string; endsAt: string }
  | { kind: "checkpoint-due"; moduleId: string; moduleOrder: number; moduleTitle: string; drills: number; minutes: number }
  | {
      kind: "drill";
      exerciseId: string;
      title: string;
      /** 1-based, among the lesson's required drills */
      index: number;
      total: number;
      lessonTitle: string;
      moduleOrder: number;
      draft: boolean;
    }
  | {
      kind: "lesson";
      lessonId: string;
      title: string;
      index: number;
      total: number;
      minutes: number;
      moduleOrder: number;
      moduleTitle: string;
    }
  | { kind: "none" };

export async function getNextStep(userId: string, syllabus: SyllabusModule[], reviewsDue: number): Promise<NextStep> {
  if (reviewsDue > 0) return { kind: "reviews", count: reviewsDue };

  // A checkpoint still running: its clock doesn't stop for the dashboard
  const open = await prisma.checkpointAttempt.findFirst({
    where: { userId, submittedAt: null },
    orderBy: { startedAt: "desc" },
    select: { id: true, startedAt: true, exerciseIds: true, module: { select: { order: true, title: true } } },
  });
  if (open) {
    const endsAt = checkpointDeadline(open.startedAt, open.exerciseIds.length);
    if (endsAt.getTime() > Date.now()) {
      return { kind: "checkpoint-open", attemptId: open.id, moduleOrder: open.module.order, moduleTitle: open.module.title, endsAt: endsAt.toISOString() };
    }
  }

  const current = syllabus.find((m) => m.state === "current");
  if (!current) return { kind: "none" };

  const lessons = await prisma.lesson.findMany({
    where: { moduleId: current.id, archivedAt: null },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      estimatedTime: true,
      progress: { where: { userId }, select: { completed: true } },
      exercises: {
        where: { archivedAt: null, required: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          submissions: { where: { userId, passed: true }, select: { id: true }, take: 1 },
          drafts: { where: { userId }, select: { updatedAt: true }, take: 1 },
        },
      },
    },
  });
  const lessonIndex = lessons.findIndex((l) => !l.progress[0]?.completed);
  if (lessonIndex < 0) {
    if (!current.checkpointDue) return { kind: "none" };
    // Its size and clock, said before it starts (it runs on the server's clock once begun)
    const mod = await prisma.module.findUnique({ where: { id: current.id }, select: { checkpointPick: true } });
    const drills = mod?.checkpointPick ?? 0;
    return {
      kind: "checkpoint-due",
      moduleId: current.id,
      moduleOrder: current.order,
      moduleTitle: current.title,
      drills,
      minutes: drills * CHECKPOINT_MINUTES_PER_DRILL,
    };
  }

  const lesson = lessons[lessonIndex]!;
  const required = lesson.exercises;
  const passed = required.filter((e) => e.submissions.length > 0).length;
  const nextDrill = required.find((e) => e.submissions.length === 0);
  // Started on its drills (or left code in one): straight back to the drill, with its draft
  if (nextDrill && (passed > 0 || nextDrill.drafts.length > 0)) {
    return {
      kind: "drill",
      exerciseId: nextDrill.id,
      title: nextDrill.title,
      index: required.indexOf(nextDrill) + 1,
      total: required.length,
      lessonTitle: lesson.title,
      moduleOrder: current.order,
      draft: nextDrill.drafts.length > 0,
    };
  }
  return {
    kind: "lesson",
    lessonId: lesson.id,
    title: lesson.title,
    index: lessonIndex + 1,
    total: lessons.length,
    minutes: lesson.estimatedTime,
    moduleOrder: current.order,
    moduleTitle: current.title,
  };
}
