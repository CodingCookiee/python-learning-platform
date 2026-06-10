import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { AchievementBadge } from "@/components/gamification";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  xpReward: number;
  unlockedAt: string | null;
}

interface AchievementsData {
  all: Achievement[];
  unlocked: Achievement[];
  total: number;
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

async function getAchievements(cookieHeader: string): Promise<AchievementsData | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/achievements`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AchievementsData;
  } catch {
    return null;
  }
}

function toValidTier(tier: string): "bronze" | "silver" | "gold" | "platinum" {
  if (tier === "bronze" || tier === "silver" || tier === "gold" || tier === "platinum") return tier;
  return "bronze";
}

function getTierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case "gold":
      return "text-yellow-500 border-yellow-500/40 bg-yellow-500/10";
    case "silver":
      return "text-slate-400 border-slate-400/40 bg-slate-400/10";
    case "bronze":
      return "text-amber-700 border-amber-700/40 bg-amber-700/10";
    case "platinum":
      return "text-violet-400 border-violet-400/40 bg-violet-400/10";
    default:
      return "text-muted-foreground";
  }
}

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const data = await getAchievements(cookieHeader);

  const allAchievements = data?.all ?? [];
  const unlockedIds = new Set((data?.unlocked ?? []).map((a) => a.id));
  const unlockedMap = new Map((data?.unlocked ?? []).map((a) => [a.id, a]));

  const byCategory: Record<string, Achievement[]> = {};
  for (const a of allAchievements) {
    const cat = a.category || "General";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(a);
  }

  const unlockedCount = data?.total ?? 0;
  const totalCount = allAchievements.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Achievements</h1>
                <p className="text-sm text-muted-foreground">
                  {unlockedCount} of {totalCount} achievements unlocked
                </p>
              </div>
              <Badge className="flex items-center gap-1.5 text-sm">
                <Trophy className="size-3.5 text-yellow-500" aria-hidden="true" />
                {unlockedCount} / {totalCount}
              </Badge>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={unlockedCount}
              aria-valuemin={0}
              aria-valuemax={totalCount}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{
                  width:
                    totalCount > 0 ? `${Math.round((unlockedCount / totalCount) * 100)}%` : "0%",
                }}
              />
            </div>
          </div>
        </FadeIn>

        {allAchievements.length === 0 && (
          <FadeIn delay={0.05}>
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <Trophy className="size-8 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-semibold">Complete lessons to earn achievements</p>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {Object.entries(byCategory).map(([category, achievements], catIdx) => {
          const catUnlocked = achievements.filter((a) => unlockedIds.has(a.id)).length;
          return (
            <FadeIn key={category} delay={0.05 * (catIdx + 1)}>
              <section aria-labelledby={`cat-${category}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    id={`cat-${category}`}
                    className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground"
                  >
                    {category}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {catUnlocked} / {achievements.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {achievements.map((achievement) => {
                    const unlocked = unlockedMap.get(achievement.id);
                    return (
                      <div key={achievement.id} className="flex flex-col items-center gap-2">
                        <AchievementBadge
                          name={achievement.name}
                          description={achievement.description}
                          icon={achievement.icon}
                          tier={toValidTier(achievement.tier)}
                          category={achievement.category}
                          xpReward={achievement.xpReward}
                          unlockedAt={unlocked?.unlockedAt ?? null}
                          size="md"
                          showTooltip
                        />
                        {unlocked && (
                          <Badge
                            variant="outline"
                            className={`text-[0.6rem] px-1.5 py-0 ${getTierColor(achievement.tier)}`}
                          >
                            {achievement.tier}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </FadeIn>
          );
        })}
      </StaggerContainer>
    </div>
  );
}
