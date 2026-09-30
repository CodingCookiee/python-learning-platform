import { prisma } from "@/lib/prisma";
import { addDays, nextReview, REVIEW_DAILY_LIMIT, REVIEW_INTERVALS, reviewEligible } from "@/lib/mastery-rules";

/**
 * Spaced review. Once a core or stretch drill is solved it joins the learner's
 * review deck, due a day later. A due review opens the drill with a blank
 * starter and no reference solution; passing pushes the next review further out
 * (1, 3, 7, 21, 60, 120 days), failing brings it back tomorrow from the start.
 * Only a due review moves the schedule: redoing a drill early is just practice.
 */

export interface ReviewQueueItem {
  exerciseId: string;
  title: string;
  type: string;
  lessonTitle: string;
  moduleTitle: string;
  stage: number;
  lapses: number;
  dueAt: string;
}

export interface ReviewQueue {
  due: ReviewQueueItem[];
  /** Everything overdue, including what's past today's limit */
  dueTotal: number;
  reviewedToday: number;
  dailyLimit: number;
  deckSize: number;
  /** Reviews due on each of the next 7 days, today first (today's excludes those already due) */
  upcoming: number[];
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Put a freshly solved drill in the deck (no-op when it's already there or not review material). */
export async function addToReview(userId: string, exercise: { id: string; difficulty: string; type: string }) {
  if (!reviewEligible(exercise)) return;
  await prisma.reviewItem.upsert({
    where: { userId_exerciseId: { userId, exerciseId: exercise.id } },
    create: { userId, exerciseId: exercise.id, dueAt: addDays(new Date(), REVIEW_INTERVALS[0]) },
    update: {},
  });
}

/** Drills solved before review existed join the deck, due a day after they were solved. */
async function backfill(userId: string) {
  const solved = await prisma.exerciseSubmission.findMany({
    where: {
      userId,
      passed: true,
      mode: "practice",
      exercise: { archivedAt: null, reviewItems: { none: { userId } } },
    },
    distinct: ["exerciseId"],
    orderBy: { submittedAt: "asc" },
    select: { exerciseId: true, submittedAt: true, exercise: { select: { difficulty: true, type: true } } },
  });
  const rows = solved
    .filter((s) => reviewEligible(s.exercise))
    .map((s) => ({ userId, exerciseId: s.exerciseId, dueAt: addDays(s.submittedAt, REVIEW_INTERVALS[0]) }));
  if (rows.length > 0) await prisma.reviewItem.createMany({ data: rows, skipDuplicates: true });
}

export async function getReviewQueue(userId: string): Promise<ReviewQueue> {
  await backfill(userId);
  const now = new Date();
  const today = startOfToday();
  const [dueItems, dueTotal, reviewedToday, deckSize, soon] = await Promise.all([
    prisma.reviewItem.findMany({
      where: { userId, dueAt: { lte: now }, exercise: { archivedAt: null } },
      orderBy: { dueAt: "asc" },
      take: REVIEW_DAILY_LIMIT,
      include: {
        exercise: {
          select: { title: true, type: true, lesson: { select: { title: true, module: { select: { title: true } } } } },
        },
      },
    }),
    prisma.reviewItem.count({ where: { userId, dueAt: { lte: now }, exercise: { archivedAt: null } } }),
    prisma.reviewItem.count({ where: { userId, lastReviewedAt: { gte: today } } }),
    prisma.reviewItem.count({ where: { userId, exercise: { archivedAt: null } } }),
    prisma.reviewItem.findMany({
      where: { userId, dueAt: { gt: now, lt: addDays(today, 7) }, exercise: { archivedAt: null } },
      select: { dueAt: true },
    }),
  ]);

  const remaining = Math.max(0, REVIEW_DAILY_LIMIT - reviewedToday);
  const upcoming = Array.from({ length: 7 }, () => 0);
  for (const s of soon) {
    const day = Math.floor((s.dueAt.getTime() - today.getTime()) / 86_400_000);
    if (day >= 0 && day < 7) upcoming[day]!++;
  }

  return {
    due: dueItems.slice(0, remaining).map((i) => ({
      exerciseId: i.exerciseId,
      title: i.exercise.title,
      type: i.exercise.type,
      lessonTitle: i.exercise.lesson.title,
      moduleTitle: i.exercise.lesson.module.title,
      stage: i.stage,
      lapses: i.lapses,
      dueAt: i.dueAt.toISOString(),
    })),
    dueTotal,
    reviewedToday,
    dailyLimit: REVIEW_DAILY_LIMIT,
    deckSize,
    upcoming,
  };
}

/** How many reviews are waiting today (for badges), within the daily limit. */
export async function countDueReviews(userId: string): Promise<number> {
  const today = startOfToday();
  const [due, reviewedToday] = await Promise.all([
    prisma.reviewItem.count({ where: { userId, dueAt: { lte: new Date() }, exercise: { archivedAt: null } } }),
    prisma.reviewItem.count({ where: { userId, lastReviewedAt: { gte: today } } }),
  ]);
  return Math.min(due, Math.max(0, REVIEW_DAILY_LIMIT - reviewedToday));
}

export interface ReviewState {
  due: boolean;
  stage: number;
  reviews: number;
  dueAt: string;
}

export async function getReviewState(userId: string, exerciseId: string): Promise<ReviewState | null> {
  const item = await prisma.reviewItem.findUnique({ where: { userId_exerciseId: { userId, exerciseId } } });
  if (!item) return null;
  return {
    due: item.dueAt.getTime() <= Date.now(),
    stage: item.stage,
    reviews: item.reviews,
    dueAt: item.dueAt.toISOString(),
  };
}

export interface ReviewOutcome {
  /** False when the drill wasn't due, so the schedule didn't move */
  counted: boolean;
  stage: number;
  nextDueAt: string | null;
}

/** Apply a review attempt to the schedule. Only the first graded attempt on a due item counts. */
export async function recordReview(
  userId: string,
  exerciseId: string,
  outcome: { passed: boolean; hintsUsed: number }
): Promise<ReviewOutcome> {
  const item = await prisma.reviewItem.findUnique({ where: { userId_exerciseId: { userId, exerciseId } } });
  if (!item || item.dueAt.getTime() > Date.now()) {
    return { counted: false, stage: item?.stage ?? 0, nextDueAt: item?.dueAt.toISOString() ?? null };
  }
  const next = nextReview(item, outcome);
  // Guard on the old due date so two quick submissions can't both count
  const updated = await prisma.reviewItem.updateMany({
    where: { id: item.id, dueAt: item.dueAt },
    data: { ...next, reviews: { increment: 1 }, lastReviewedAt: new Date() },
  });
  if (updated.count === 0) return { counted: false, stage: item.stage, nextDueAt: null };
  return { counted: true, stage: next.stage, nextDueAt: next.dueAt.toISOString() };
}
