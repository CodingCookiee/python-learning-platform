import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/server-url";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AchievementBadge } from "@/components/gamification";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { StreakDisplay } from "@/components/gamification/streak-display";
import { AnimatedProgressBar } from "@/components/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileCard } from "./_components/profile-card";
import { CheckCircle2, Calendar } from "lucide-react";

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

function toValidTier(tier: string): "bronze" | "silver" | "gold" | "platinum" {
  if (tier === "bronze" || tier === "silver" || tier === "gold" || tier === "platinum") return tier;
  return "bronze";
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
  const initials = (user.name ?? user.email ?? "U").slice(0, 2).toUpperCase();
  const recentAchievements = achievements.unlocked.slice(0, 8);
  const recentLessons = recentActivity.lessons.slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />
        <FadeIn>
          <ProfileCard
            initials={initials}
            name={user.name ?? "Anonymous"}
            email={user.email ?? ""}
            level={user.level}
            achievements={achievements.total}
            lessonsCompleted={completion.lessons.completed}
            completionPercentage={completion.overall}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col gap-1.5 pt-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground font-heading">
                  XP
                </p>
                <p className="font-heading text-2xl font-bold">{user.xp.toLocaleString()}</p>
                <XpProgressBar xp={user.xp} level={user.level} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1.5 pt-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground font-heading">
                  Streak
                </p>
                <StreakDisplay currentStreak={streak.current} longestStreak={streak.longest} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1.5 pt-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground font-heading">
                  Lessons
                </p>
                <p className="font-heading text-2xl font-bold">
                  {completion.lessons.completed}
                  <span className="text-base font-normal text-muted-foreground">
                    /{completion.lessons.total}
                  </span>
                </p>
                <AnimatedProgressBar
                  value={completion.lessons.percentage}
                  aria-label="Lessons progress"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1.5 pt-5">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground font-heading">
                  Projects
                </p>
                <p className="font-heading text-2xl font-bold">
                  {completion.projects.completed}
                  <span className="text-base font-normal text-muted-foreground">
                    /{completion.projects.total}
                  </span>
                </p>
                <AnimatedProgressBar
                  value={completion.projects.percentage}
                  aria-label="Projects progress"
                />
              </CardContent>
            </Card>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FadeIn delay={0.1}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Achievements</CardTitle>
                <Link
                  href="/achievements"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {recentAchievements.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {recentAchievements.map((a) => (
                      <AchievementBadge
                        key={a.id}
                        name={a.name}
                        description={a.description}
                        icon={a.icon}
                        tier={toValidTier(a.tier)}
                        category={a.category}
                        xpReward={a.xpReward}
                        unlockedAt={a.unlockedAt as string}
                        size="sm"
                        showTooltip
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No achievements yet.</p>
                )}
              </CardContent>
            </Card>
          </FadeIn>
          <FadeIn delay={0.12}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentLessons.length > 0 ? (
                  <ol className="flex flex-col gap-3" role="list">
                    {recentLessons.map(({ lesson, completedAt }) => (
                      <li key={lesson.id} className="flex items-start gap-3">
                        <CheckCircle2
                          className="mt-0.5 size-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <Link
                            href={`/lessons/${lesson.id}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {lesson.title}
                          </Link>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="size-3" aria-hidden="true" />
                            {formatDate(completedAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start a lesson to see your journey here.
                  </p>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </StaggerContainer>
    </div>
  );
}
