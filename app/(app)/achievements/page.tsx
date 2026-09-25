import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/server-url";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AchievementPatch } from "@/components/gamification/achievement-badge";
import { tierStyle } from "@/lib/achievement-tier";
import { SealMark } from "@/components/brand/marks";

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

async function getAchievements(cookieHeader: string): Promise<AchievementsData | null> {
  try {
    const res = await fetch(`${await getAppOrigin()}/api/achievements`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AchievementsData;
  } catch {
    return null;
  }
}

function formatDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
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

  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Achievements" }]} />
        <FadeIn>
          <header className="flex flex-col gap-6 border-b border-border pb-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em]">
                  Achievements
                </h1>
                <p className="max-w-xl text-muted-foreground">
                  Every patch is sewn on for something you actually did: lessons finished,
                  modules passed, streaks kept.
                </p>
              </div>
              <p className="font-condensed tabular leading-none">
                <span className="text-6xl font-extrabold tracking-[-0.03em]">{unlockedCount}</span>
                <span className="ml-1 text-2xl font-bold text-muted-foreground">/ {totalCount}</span>
              </p>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-sm bg-muted"
              role="progressbar"
              aria-label="Achievements earned"
              aria-valuenow={unlockedCount}
              aria-valuemin={0}
              aria-valuemax={totalCount}
            >
              <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </header>
        </FadeIn>

        {allAchievements.length === 0 && (
          <FadeIn delay={0.05}>
            <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-border py-16 text-center">
              <SealMark className="size-8 text-muted-foreground" />
              <p className="font-semibold">Finish your first lesson to earn your first patch.</p>
            </div>
          </FadeIn>
        )}

        {Object.entries(byCategory).map(([category, achievements], catIdx) => {
          const catUnlocked = achievements.filter((a) => unlockedIds.has(a.id)).length;
          return (
            <FadeIn key={category} delay={0.05 * (catIdx + 1)}>
              <section aria-labelledby={`cat-${category}`} className="flex flex-col gap-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id={`cat-${category}`} className="text-xl font-semibold">
                    {category}
                  </h2>
                  <span className="font-condensed tabular text-sm text-muted-foreground">
                    {catUnlocked} of {achievements.length}
                  </span>
                </div>
                <ul className="flex flex-col border-t border-border">
                  {achievements.map((achievement) => {
                    const unlocked = unlockedMap.get(achievement.id);
                    const t = tierStyle(achievement.tier);
                    return (
                      <li
                        key={achievement.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-b border-border py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                      >
                        <AchievementPatch
                          icon={achievement.icon}
                          tier={achievement.tier}
                          locked={!unlocked}
                          size="sm"
                          className="row-span-2 sm:row-span-1"
                        />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className={unlocked ? "font-semibold" : "font-semibold text-foreground/70"}>
                            {achievement.name}
                          </span>
                          <span className="text-sm text-muted-foreground">{achievement.description}</span>
                        </div>
                        <span className="font-condensed tabular text-sm whitespace-nowrap text-muted-foreground sm:text-right">
                          {t.label} · {achievement.xpReward} XP
                          <span className="block">
                            {unlocked ? `earned ${formatDate(unlocked.unlockedAt)}` : "not yet earned"}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </FadeIn>
          );
        })}
      </StaggerContainer>
    </div>
  );
}
