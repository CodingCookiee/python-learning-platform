import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { invalidateUserCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/streak/ping
 * Called on app load. Visiting is not training: the streak only grows when
 * the learner finishes a lesson, passes a drill or has a capstone approved
 * (those routes call updateStreak). This ping only reconciles a streak that
 * has lapsed, so the number shown is always honest.
 */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    const streak = await prisma.streak.findUnique({ where: { userId: context.userId } });
    if (!streak) {
      return NextResponse.json({ currentStreak: 0, longestStreak: 0, achievements: [] });
    }

    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const last = new Date(streak.lastActivityDate);
    last.setHours(0, 0, 0, 0);

    let currentStreak = streak.currentStreak;
    // No training yesterday or today: the run is broken
    if (currentStreak > 0 && last.getTime() < yesterday.getTime()) {
      currentStreak = 0;
      await prisma.streak.update({ where: { userId: context.userId }, data: { currentStreak: 0 } });
      await invalidateUserCache(context.userId);
    }

    return NextResponse.json({
      currentStreak,
      longestStreak: streak.longestStreak,
      achievements: [],
    });
  } catch (error) {
    console.error("Error reconciling streak via ping:", error);
    return NextResponse.json({ error: "Failed to check streak" }, { status: 500 });
  }
});
