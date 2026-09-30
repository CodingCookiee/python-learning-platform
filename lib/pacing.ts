import { prisma } from "@/lib/prisma";
import { AUTOMATION_TRACK, getCurriculumState, PYTHON_TRACK, type TrackProgress } from "@/lib/curriculum-state";

/**
 * Pacing: the learner's weekly target against what they actually trained this
 * week, and when that pace gets them to their goal. Training time is estimated
 * from the work itself (lesson minutes, drills, reviews, checkpoints), since the
 * app can't see time spent in an editor elsewhere.
 */

const DRILL_MINUTES = 6;
const REVIEW_MINUTES = 4;
const CHECKPOINT_MINUTES = 30;

export interface Pace {
  weeklyHours: number;
  goal: "python" | "automation";
  hoursThisWeek: number;
  /** Hours of course left before the goal, from module estimates and progress */
  hoursLeft: number;
  /** When the goal lands at the weekly target; null once it's reached */
  projectedFinish: string | null;
  goalLabel: string;
}

export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // Weeks start on Monday
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function hoursLeftIn(track: TrackProgress | undefined): number {
  if (!track) return 0;
  return track.modules.reduce((sum, m) => {
    if (m.passed) return sum;
    const done = m.lessonsTotal > 0 ? m.lessonsDone / m.lessonsTotal : 0;
    // The checkpoint and capstone are part of the module's estimate, so an unpassed module keeps a share
    return sum + m.duration * Math.max(0.15, 1 - done);
  }, 0);
}

export async function getPace(userId: string): Promise<Pace> {
  const since = startOfWeek();
  const [user, lessons, drills, reviews, checkpoints, tracks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { weeklyHours: true, goal: true } }),
    prisma.progress.findMany({
      where: { userId, completed: true, completedAt: { gte: since } },
      select: { lesson: { select: { estimatedTime: true } } },
    }),
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: true, mode: "practice", submittedAt: { gte: since } },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    }),
    prisma.reviewItem.count({ where: { userId, lastReviewedAt: { gte: since } } }),
    prisma.checkpointAttempt.count({ where: { userId, submittedAt: { gte: since } } }),
    getCurriculumState(userId),
  ]);

  const minutes =
    lessons.reduce((n, p) => n + p.lesson.estimatedTime, 0) +
    drills.length * DRILL_MINUTES +
    reviews * REVIEW_MINUTES +
    checkpoints * CHECKPOINT_MINUTES;

  const goal = user?.goal === "automation" ? "automation" : "python";
  const python = tracks.find((t) => t.slug === PYTHON_TRACK);
  const automation = tracks.find((t) => t.slug === AUTOMATION_TRACK);
  const hoursLeft = Math.round(hoursLeftIn(python) + (goal === "automation" ? hoursLeftIn(automation) : 0));
  const weeklyHours = Math.max(1, user?.weeklyHours ?? 10);
  const projectedFinish =
    hoursLeft > 0 ? new Date(Date.now() + (hoursLeft / weeklyHours) * 7 * 86_400_000).toISOString() : null;

  return {
    weeklyHours,
    goal,
    hoursThisWeek: Math.round((minutes / 60) * 10) / 10,
    hoursLeft,
    projectedFinish,
    goalLabel: goal === "automation" ? "the AI automation dan grades" : "your black belt",
  };
}
