import { NextRequest, NextResponse } from "next/server";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { updateStreak } from "@/lib/achievements";
import { invalidateUserCache } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/streak/ping
 * Records daily activity without requiring a lesson/exercise submission.
 * Called on app load so that simply visiting the app counts toward the streak.
 * Idempotent — updateStreak handles same-day no-ops.
 */
export const POST = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    const currentStreak = await updateStreak(context.userId);

    await invalidateUserCache(context.userId);

    // Fetch the updated streak record for longestStreak
    const streakRecord = await prisma.streak.findUnique({
      where: { userId: context.userId },
      select: { longestStreak: true },
    });

    // Fetch any achievements that may have just been unlocked (last 5 seconds)
    const since = new Date(Date.now() - 5_000);
    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: context.userId,
        unlockedAt: { gte: since },
      },
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            tier: true,
            xpReward: true,
          },
        },
      },
    });

    return NextResponse.json({
      currentStreak,
      longestStreak: streakRecord?.longestStreak ?? currentStreak,
      achievements: recentAchievements.map((ua) => ua.achievement),
    });
  } catch (error) {
    console.error("Error updating streak via ping:", error);
    return NextResponse.json({ error: "Failed to update streak" }, { status: 500 });
  }
});
