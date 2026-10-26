import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { streakLapsed } from "@/lib/achievements";
import { dayKey } from "@/lib/day";
import { rememberTimeZone } from "@/lib/learner-time-zone";

/**
 * POST /api/streak/ping
 * Called on app load, with the browser's time zone ({ timeZone: "Europe/London" }), which is saved
 * so the learner's days (streaks, daily limits, the training week) are their own rather than UTC's.
 * Visiting is not training: the streak only grows when the learner finishes a lesson, passes a
 * drill or has a capstone approved (those routes call updateStreak). This ping only reconciles a
 * streak that has lapsed, so the number shown is always honest.
 */
export const POST = withAuth(async (req: NextRequest, context: AuthContext) => {
  try {
    const body = (await req.json().catch(() => null)) as { timeZone?: unknown } | null;
    const [user, streak] = await Promise.all([
      prisma.user.findUnique({ where: { id: context.userId }, select: { timeZone: true } }),
      prisma.streak.findUnique({ where: { userId: context.userId } }),
    ]);
    const timeZone = await rememberTimeZone(context.userId, body?.timeZone, user?.timeZone ?? null);
    if (!streak) {
      return NextResponse.json({ currentStreak: 0, longestStreak: 0 });
    }

    let currentStreak = streak.currentStreak;
    // No training yesterday or today (the learner's days): the run is broken
    if (streakLapsed(streak, dayKey(new Date(), timeZone))) {
      currentStreak = 0;
      await prisma.streak.update({ where: { userId: context.userId }, data: { currentStreak: 0 } });
      await invalidateUserCache(context.userId);
    }

    return NextResponse.json({ currentStreak, longestStreak: streak.longestStreak });
  } catch (error) {
    console.error("Error reconciling streak via ping:", error);
    return NextResponse.json({ error: "Failed to check streak" }, { status: 500 });
  }
});
