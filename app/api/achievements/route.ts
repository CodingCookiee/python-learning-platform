import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, AuthContext } from "@/lib/api-auth";
import { NextRequest } from "next/server";

/**
 * GET /api/achievements
 * Returns all achievements with unlock status for the current user.
 */
export const GET = withAuth(async (_req: NextRequest, context: AuthContext) => {
  try {
    const [allAchievements, userAchievements] = await Promise.all([
      prisma.achievement.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
      prisma.userAchievement.findMany({
        where: { userId: context.userId },
        include: {
          achievement: { select: { id: true } },
        },
      }),
    ]);

    const unlockedMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt.toISOString()])
    );

    const all = allAchievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      tier: a.tier,
      xpReward: a.xpReward,
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }));

    const unlocked = all.filter((a) => a.unlockedAt !== null);

    return NextResponse.json({ all, unlocked, total: unlocked.length });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 });
  }
});
