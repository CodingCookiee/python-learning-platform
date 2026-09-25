import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { initialsFor } from "@/lib/utils";
import Link from "next/link";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/server-url";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { StreakDisplay } from "@/components/gamification/streak-display";
import { ProfileCard } from "./_components/profile-card";
import { Check } from "lucide-react";
import { RankCard } from "@/components/brand/rank-card";
import { AchievementPatch } from "@/components/gamification/achievement-badge";
import { SealMark } from "@/components/brand/marks";
import { getLearnerRank } from "@/lib/learner-rank";
import { tierStyle } from "@/lib/achievement-tier";

interface ProgressData {
  user: { id: string; name: string | null; email: string | null; xp: number; level: number };
  streak: { current: number; longest: number; lastActivity: string | Date; activeDates: string[] };
  completion: {
    lessons: { completed: number; total: number; percentage: number };
    exercises: { completed: number; total: number; percentage: number };
    projects: { completed: number; total: number; percentage: number };
    overall: number;
  };
  modules: Array<{
    moduleId: string;
    moduleTitle: string;
    lessonsCompleted: number;
    lessonsTotal: number;
    projectsCompleted: number;
    projectsTotal: number;
    completionPercentage: number;
  }>;
  recentActivity: {
    lessons: Array<{
      lesson: { id: string; title: string; moduleId: string; order: number };
      completedAt: string | Date;
    }>;
    projects: Array<{ project: { id: string; title: string; moduleId: string; xpReward: number } }>;
  };
  achievements: {
    unlocked: Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      category: string;
      tier: string;
      xpReward: number;
      unlockedAt: string | Date;
    }>;
    total: number;
  };
}

async function getProgressData(cookieHeader: string): Promise<ProgressData | null> {
  try {
    const res = await fetch(`${await getAppOrigin()}/api/progress`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ProgressData;
  } catch {
    return null;
  }
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const data = await getProgressData(cookieHeader);
  if (!data) redirect("/dashboard");

  const { user, streak, completion, recentActivity, achievements } = data;
  const rank = await getLearnerRank(user.id);
  const initials = initialsFor(user.name, user.email);
  const recentAchievements = achievements.unlocked.slice(0, 6);
  const recentLessons = recentActivity.lessons.slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />

        <FadeIn>
          <ProfileCard
            initials={initials}
            name={user.name ?? "Unnamed learner"}
            email={user.email ?? ""}
            level={user.level}
          />
        </FadeIn>

        <FadeIn delay={0.04}>
          <RankCard rank={rank} />
        </FadeIn>

        {/* Training record: ruled facts, not stat cards */}
        <FadeIn delay={0.08}>
          <section aria-labelledby="record-heading" className="flex flex-col gap-5">
            <h2 id="record-heading" className="text-xl font-semibold">
              Training record
            </h2>
            <dl className="grid gap-x-10 border-t border-border sm:grid-cols-2">
              <div className="flex flex-col gap-3 border-b border-border py-5">
                <dt className="text-sm text-muted-foreground">Experience</dt>
                <dd className="flex flex-col gap-3">
                  <span className="font-condensed tabular text-3xl leading-none font-extrabold">
                    {user.xp.toLocaleString()} XP
                  </span>
                  <XpProgressBar xp={user.xp} level={user.level} />
                </dd>
              </div>
              <div className="flex flex-col gap-3 border-b border-border py-5">
                <dt className="text-sm text-muted-foreground">Streak</dt>
                <dd>
                  <StreakDisplay currentStreak={streak.current} longestStreak={streak.longest} />
                </dd>
              </div>
              <div className="flex items-end justify-between gap-4 border-b border-border py-5">
                <dt className="text-sm text-muted-foreground">Lessons finished</dt>
                <dd className="font-condensed tabular leading-none">
                  <span className="text-3xl font-extrabold">{completion.lessons.completed}</span>
                  <span className="text-lg font-bold text-muted-foreground"> / {completion.lessons.total}</span>
                </dd>
              </div>
              <div className="flex items-end justify-between gap-4 border-b border-border py-5">
                <dt className="text-sm text-muted-foreground">Capstone projects approved</dt>
                <dd className="font-condensed tabular leading-none">
                  <span className="text-3xl font-extrabold">{completion.projects.completed}</span>
                  <span className="text-lg font-bold text-muted-foreground"> / {completion.projects.total}</span>
                </dd>
              </div>
            </dl>
          </section>
        </FadeIn>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <FadeIn delay={0.12}>
            <section aria-labelledby="patches-heading" className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="patches-heading" className="text-xl font-semibold">
                  Recent achievements
                </h2>
                <Link href="/achievements" className="text-sm font-medium text-primary underline">
                  All {achievements.total > 0 ? achievements.total : ""} achievements
                </Link>
              </div>
              {recentAchievements.length > 0 ? (
                <ul className="flex flex-col border-t border-border">
                  {recentAchievements.map((a) => (
                    <li key={a.id} className="flex items-center gap-4 border-b border-border py-3">
                      <AchievementPatch icon={a.icon} tier={a.tier} size="sm" />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-semibold">{a.name}</span>
                        <span className="font-condensed tabular text-xs text-muted-foreground">
                          {tierStyle(a.tier).label} · {a.xpReward} XP · {formatDate(a.unlockedAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
                  <SealMark className="size-5" />
                  Finish your first lesson to earn your first achievement.
                </div>
              )}
            </section>
          </FadeIn>

          <FadeIn delay={0.14}>
            <section aria-labelledby="activity-heading" className="flex flex-col gap-5">
              <h2 id="activity-heading" className="text-xl font-semibold">
                Recently finished
              </h2>
              {recentLessons.length > 0 ? (
                <ol className="flex flex-col border-t border-border">
                  {recentLessons.map(({ lesson, completedAt }) => (
                    <li key={lesson.id} className="flex items-center gap-3 border-b border-border py-3">
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className="min-w-0 flex-1 truncate font-medium hover:underline"
                      >
                        {lesson.title}
                      </Link>
                      <span className="font-condensed tabular shrink-0 text-sm text-muted-foreground">
                        {formatDate(completedAt)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
                  Lessons you finish show up here.
                </p>
              )}
            </section>
          </FadeIn>
        </div>
      </StaggerContainer>
    </div>
  );
}
