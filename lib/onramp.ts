import { prisma } from "@/lib/prisma";
import { START_TRACK } from "@/lib/curriculum-state";

/**
 * The beginner on-ramp ("Start here", the Start track's one module): where a learner is in it,
 * what's left, and whether the dashboard should keep it in front of them. It never gates
 * anything and gives no grade (docs/superpowers/specs/2026-10-07-beginner-on-ramp-design.md).
 */

export { START_TRACK };

export interface OnRampLesson {
  id: string;
  title: string;
  order: number;
  minutes: number;
  completed: boolean;
}

export interface OnRampProgress {
  /** The first unfinished lesson, numbered from 1, or null when they're all done */
  next: { id: string; title: string; number: number } | null;
  done: number;
  total: number;
  /** The time estimates of the lessons still to do, added up */
  minutesLeft: number;
}

export interface OnRamp extends OnRampProgress {
  moduleId: string;
  title: string;
  lessons: OnRampLesson[];
  started: boolean;
  finished: boolean;
  /** Beginners, and anyone who has started it, see it on the dashboard until it's finished */
  showOnDashboard: boolean;
}

export function remaining(lessons: OnRampLesson[]): OnRampProgress {
  const ordered = [...lessons].sort((a, b) => a.order - b.order);
  const nextIndex = ordered.findIndex((l) => !l.completed);
  const next = nextIndex === -1 ? null : ordered[nextIndex]!;
  return {
    next: next ? { id: next.id, title: next.title, number: nextIndex + 1 } : null,
    done: ordered.filter((l) => l.completed).length,
    total: ordered.length,
    minutesLeft: ordered.filter((l) => !l.completed).reduce((sum, l) => sum + l.minutes, 0),
  };
}

/** The learner's place in the on-ramp, or null if there is no Start track */
export async function getOnRamp(userId: string): Promise<OnRamp | null> {
  const [onRampModule, user] = await Promise.all([
    prisma.module.findFirst({
      where: { archivedAt: null, track: { slug: START_TRACK, archivedAt: null } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        lessons: {
          where: { archivedAt: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            order: true,
            estimatedTime: true,
            progress: { where: { userId, completed: true }, select: { id: true } },
          },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { experience: true } }),
  ]);
  if (!onRampModule) return null;

  const lessons: OnRampLesson[] = onRampModule.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    order: l.order,
    minutes: l.estimatedTime,
    completed: l.progress.length > 0,
  }));
  const progress = remaining(lessons);
  const started = progress.done > 0;
  const finished = progress.total > 0 && progress.done === progress.total;
  return {
    moduleId: onRampModule.id,
    title: onRampModule.title,
    lessons,
    ...progress,
    started,
    finished,
    showOnDashboard: !finished && (started || user?.experience === "new"),
  };
}
