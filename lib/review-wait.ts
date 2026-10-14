import { prisma } from "@/lib/prisma";

/**
 * How long a capstone waits for the examiner, from the record rather than a promise: the median
 * time from hand-in to decision over recent reviews, and how many hand-ins are ahead in the queue.
 */

/** Reviews counted: decided in the last 90 days, the most recent 40 */
const WINDOW_DAYS = 90;
const SAMPLE = 40;
/** Fewer decisions than this say too little to quote */
const MIN_SAMPLE = 3;

export interface ReviewWait {
  /** "about 2 days", or null while there are too few recent reviews to say */
  typical: string | null;
  /** Hand-ins waiting that were submitted before this one */
  ahead: number;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A wait in words, rounded the way a person would say it */
export function describeWait(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1.5) return "about an hour";
  if (hours < 20) return `about ${Math.round(hours)} hours`;
  const days = Math.max(1, Math.round(hours / 24));
  return days === 1 ? "about a day" : `about ${days} days`;
}

export async function capstoneReviewWait(submittedAt: Date): Promise<ReviewWait> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const [decided, ahead] = await Promise.all([
    prisma.projectSubmission.findMany({
      where: { status: { in: ["approved", "rejected"] }, evaluatedAt: { gte: since } },
      orderBy: { evaluatedAt: "desc" },
      take: SAMPLE,
      select: { submittedAt: true, evaluatedAt: true },
    }),
    prisma.projectSubmission.count({ where: { status: "pending", submittedAt: { lt: submittedAt } } }),
  ]);
  const waits = decided.flatMap((s) => (s.evaluatedAt ? [s.evaluatedAt.getTime() - s.submittedAt.getTime()] : []));
  const typical = waits.length >= MIN_SAMPLE ? median(waits) : null;
  return { typical: typical === null ? null : describeWait(typical), ahead };
}
