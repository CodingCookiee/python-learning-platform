import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AchievementPatch } from "@/components/gamification/achievement-badge";
import { BeltBand } from "@/components/brand/belt";
import { tierStyle } from "@/lib/achievement-tier";
import { getAchievementBoard, type BoardAchievement } from "@/lib/achievements";
import type { BeltKey } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Achievements" };

/** Sections in the order of the path: learning first, the belts and modules, then the long game */
const CATEGORY_ORDER = ["Learning", "Belts", "Modules", "Capstones", "Streaks", "Experience"];

/** Belt achievements are drawn as the belt itself, not a patch */
const BELT_ART: Record<string, { belt: BeltKey; stripes?: number }> = {
  "belt-yellow": { belt: "yellow" },
  "belt-green": { belt: "green" },
  "belt-blue": { belt: "blue" },
  "belt-brown": { belt: "brown" },
  "belt-black": { belt: "black" },
  // The 9th dan: the black belt with all eight dan stripes
  "automation-engineer": { belt: "black", stripes: 8 },
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** The row's emblem: the belt for belt achievements, otherwise the patch */
function Emblem({ achievement }: { achievement: BoardAchievement }) {
  const belt = achievement.slug ? BELT_ART[achievement.slug] : undefined;
  if (belt) {
    return (
      <span className={cn("flex size-14 shrink-0 items-center", !achievement.unlockedAt && "opacity-45 grayscale")} aria-hidden="true">
        <BeltBand belt={belt.belt} slots={belt.stripes ?? 0} filled={belt.stripes ?? 0} compact className="h-4 w-14" />
      </span>
    );
  }
  return <AchievementPatch icon={achievement.icon} tier={achievement.tier} locked={!achievement.unlockedAt} size="sm" />;
}

/** How far along, as words and a thin bar */
function ProgressLine({ progress }: { progress: NonNullable<BoardAchievement["progress"]> }) {
  const pct = Math.round((progress.done / progress.of) * 100);
  return (
    <span className="flex items-center gap-3">
      <span className="font-condensed tabular text-sm whitespace-nowrap text-muted-foreground">
        {progress.done.toLocaleString()} of {progress.of.toLocaleString()} {progress.unit}
      </span>
      <span className="h-1.5 w-20 overflow-hidden rounded-[2px] bg-muted" aria-hidden="true">
        <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function AchievementRow({ achievement, showProgress = false }: { achievement: BoardAchievement; showProgress?: boolean }) {
  const t = tierStyle(achievement.tier);
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1 border-b border-border py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="row-span-2 sm:row-span-1">
        <Emblem achievement={achievement} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={achievement.unlockedAt ? "font-semibold" : "font-semibold text-foreground/75"}>{achievement.name}</span>
        <span className="text-sm text-muted-foreground">{achievement.description}</span>
      </div>
      <span className="font-condensed tabular text-sm text-muted-foreground sm:text-right">
        {achievement.unlockedAt ? (
          <>
            {t.label} · {achievement.xpReward} XP
            <span className="block">earned {formatDate(achievement.unlockedAt)}</span>
          </>
        ) : showProgress && achievement.progress ? (
          <ProgressLine progress={achievement.progress} />
        ) : (
          <>
            {t.label} · {achievement.xpReward} XP
          </>
        )}
      </span>
    </li>
  );
}

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const board = await getAchievementBoard(session.user.id);
  const earnedCount = board.filter((a) => a.unlockedAt).length;
  const total = board.length;
  const pct = total > 0 ? Math.round((earnedCount / total) * 100) : 0;

  // The three locked ones nearest to done (with a count to show), path order breaking ties; one
  // rung per ladder, so "25 drills" doesn't crowd out everything else with "100" and "300"
  const seen = new Set<string>();
  const closest = board
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !a.unlockedAt && a.progress && a.progress.done < a.progress.of)
    .sort((x, y) => y.a.progress!.done / y.a.progress!.of - x.a.progress!.done / x.a.progress!.of || x.i - y.i)
    .filter(({ a }) => !seen.has(a.family) && Boolean(seen.add(a.family)))
    .slice(0, 3)
    .map(({ a }) => a);

  const categories = [...new Set(board.map((a) => a.category || "General"))].sort(
    (a, b) => (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99)
  );

  return (
    <div className="mx-auto max-w-page px-gutter py-8 sm:py-12">
      <StaggerContainer className="flex flex-col gap-10">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Achievements" }]} />
        <FadeIn>
          <header className="flex flex-col gap-6 border-b border-border pb-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="flex flex-col gap-2">
                <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em]">Achievements</h1>
                <p className="max-w-xl text-muted-foreground">
                  Every patch is sewn on for something you actually did: lessons finished, modules passed, streaks kept.
                </p>
              </div>
              <p className="font-condensed tabular leading-none">
                <span className="text-6xl font-extrabold tracking-[-0.03em]">{earnedCount}</span>
                <span className="ml-1 text-2xl font-bold text-muted-foreground">/ {total}</span>
              </p>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-sm bg-muted"
              role="progressbar"
              aria-label="Achievements earned"
              aria-valuenow={earnedCount}
              aria-valuemin={0}
              aria-valuemax={total}
            >
              <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          </header>
        </FadeIn>

        {closest.length > 0 && (
          <FadeIn delay={0.05}>
            <section aria-labelledby="closest-heading" className="flex flex-col gap-5">
              <h2 id="closest-heading" className="text-xl font-semibold">
                Closest to earning
              </h2>
              <ul className="flex flex-col border-t border-border">
                {closest.map((a) => (
                  <AchievementRow key={a.id} achievement={a} showProgress />
                ))}
              </ul>
            </section>
          </FadeIn>
        )}

        {categories.map((category, catIdx) => {
          const items = board.filter((a) => (a.category || "General") === category);
          const earned = items.filter((a) => a.unlockedAt);
          const toEarn = items.filter((a) => !a.unlockedAt);
          return (
            <FadeIn key={category} delay={0.05 * (catIdx + 2)}>
              <section aria-labelledby={`cat-${category}`} className="flex flex-col gap-5">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id={`cat-${category}`} className="text-xl font-semibold">
                    {category}
                  </h2>
                  <span className="font-condensed tabular text-sm text-muted-foreground">
                    {earned.length} of {items.length}
                  </span>
                </div>
                {earned.length > 0 && (
                  <ul className="flex flex-col border-t border-border">
                    {earned.map((a) => (
                      <AchievementRow key={a.id} achievement={a} />
                    ))}
                  </ul>
                )}
                {/* What's left stays folded until asked for, so the page leads with what was earned */}
                {toEarn.length > 0 && (
                  <details className="group border-t border-border">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                      <span>
                        {toEarn.length} still to earn{earned.length === 0 ? "" : ` in ${category.toLowerCase()}`}
                      </span>
                      <span className="text-xs group-open:hidden">Show</span>
                      <span className="hidden text-xs group-open:inline">Hide</span>
                    </summary>
                    <ul className="flex flex-col border-t border-border">
                      {toEarn.map((a) => (
                        <AchievementRow key={a.id} achievement={a} showProgress />
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            </FadeIn>
          );
        })}
      </StaggerContainer>
    </div>
  );
}
