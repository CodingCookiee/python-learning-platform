import { distinctLimit, type LimitResult } from "@/lib/rate-limit";

/**
 * Counts the course pages a learner opens (lessons and practice drills), by page. Past a pace nobody
 * reads at, new pages pause for a while: that's a script copying the course, which the terms of use
 * rule out. Reopening a page they've already had is never counted or refused, so work in progress
 * goes on. Gradings and reviews aren't counted: they're paced by the learner's progress already.
 *
 * Returns the limit that was hit, or null when the page can open.
 */
export async function readingTooFast(userId: string, page: string): Promise<LimitResult | null> {
  const hour = await distinctLimit("contentRead", userId, page);
  if (!hour.ok) return hour;
  const day = await distinctLimit("contentReadDay", userId, page);
  return day.ok ? null : day;
}

/** "a minute", "25 minutes", "3 hours": how long until new pages open again */
export function waitInWords(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  if (minutes <= 1) return "a minute";
  if (minutes < 90) return `${minutes} minutes`;
  return `${Math.round(minutes / 60)} hours`;
}
