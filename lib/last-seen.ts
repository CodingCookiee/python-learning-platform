import { prisma } from "@/lib/prisma";

/** How often a visit is written down: a write on every click would be wasteful */
const SEEN_EVERY_MS = 5 * 60_000;

/** Note that the account used the app now, unless that was noted in the last few minutes. Never throws */
export function recordSeen(userId: string, lastSeenAt: Date | null): void {
  if (lastSeenAt && Date.now() - lastSeenAt.getTime() < SEEN_EVERY_MS) return;
  void prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
}
