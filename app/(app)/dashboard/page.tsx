import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { BookOpen, Trophy, Flame, Zap, ArrowRight, Clock } from "lucide-react";

interface ProgressData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    xp: number;
    level: number;
  };
  streak: {
    current: number;
    longest: number;
    lastActivity: string | Date;
  };
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
    projects: Array<{
      project: { id: string; title: string; moduleId: string; xpReward: number };
    }>;
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
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/progress`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ProgressData;
  } catch {
    return null;
  }
}

function getPhaseLabel(moduleTitle: string): string {
  const title = moduleTitle.toLowerCase();
  if (title.includes("foundation") || title.includes("basic") || title.includes("intro"))
    return "Phase 1";
  if (title.includes("intermediate") || title.includes("function") || title.includes("oop"))
    return "Phase 2";
  if (title.includes("advanced") || title.includes("async") || title.includes("data"))
    return "Phase 3";
  return "Phase 4";
}

function getTierColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case "gold":
      return "text-yellow-500";
    case "silver":
      return "text-slate-400";
    case "bronze":
      return "text-amber-700";
    default:
      return "text-muted-foreground";
  }
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const data = await getProgressData(cookieHeader);

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">
            Something went wrong loading your dashboard. Please try again.
          </p>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Retry</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { user, streak, completion, modules, recentActivity, achievements } = data;
  const currentModule =
    modules.find((m) => m.completionPercentage > 0 && m.completionPercentage < 100) ??
    modules.find((m) => m.completionPercentage === 0) ??
    null;
  const recentLessons = recentActivity.lessons.slice(0, 3);
  const recentAchievements = achievements.unlocked.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                Welcome back, {user.name ?? "there"} 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Keep going — you&apos;re {completion.overall}% of the way through the curriculum.
              </p>
            </div>
            <Badge className="mt-2 flex w-fit items-center gap-1.5 text-sm sm:mt-0">
              <Flame className="size-3.5 text-orange-500" aria-hidden="true" />
              <span>🔥 {streak.current} day streak</span>
            </Badge>
          </div>
        </FadeIn>
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col gap-3 pt-8">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Overall Progress
                </p>
                <p className="font-heading text-3xl font-semibold">{completion.overall}%</p>
                <Progress
                  value={completion.overall}
                  aria-label={`${completion.overall}% complete`}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-8">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Current Streak
                </p>
                <p className="font-heading text-3xl font-semibold flex items-center gap-2">
                  <Flame className="size-6 text-orange-500" aria-hidden="true" />
                  {streak.current} days
                </p>
                <p className="text-xs text-muted-foreground">Longest: {streak.longest} days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-8">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Lessons Done
                </p>
                <p className="font-heading text-3xl font-semibold">
                  {completion.lessons.completed}
                  <span className="text-lg font-normal text-muted-foreground">
                    /{completion.lessons.total}
                  </span>
                </p>
                <Progress
                  value={completion.lessons.percentage}
                  aria-label={`${completion.lessons.percentage}% lessons complete`}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-8">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Level &amp; XP
                </p>
                <p className="font-heading text-3xl font-semibold">Level {user.level}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="size-3 text-yellow-500" aria-hidden="true" />
                  {user.xp.toLocaleString()} XP
                </p>
              </CardContent>
            </Card>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <h2 className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Continue Learning
              </h2>
              {currentModule ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <Badge className="mb-1 w-fit text-muted-foreground">
                          {getPhaseLabel(currentModule.moduleTitle)}
                        </Badge>
                        <CardTitle>{currentModule.moduleTitle}</CardTitle>
                      </div>
                      <span className="font-heading text-2xl font-semibold text-muted-foreground">
                        {currentModule.completionPercentage}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Progress
                        value={currentModule.completionPercentage}
                        className="h-1.5"
                        aria-label={`${currentModule.completionPercentage}% of module complete`}
                      />
                      <p className="text-xs text-muted-foreground">
                        {currentModule.lessonsCompleted} of {currentModule.lessonsTotal} lessons
                        complete
                      </p>
                    </div>
                    <Button asChild className="w-fit">
                      <Link href={`/modules/${currentModule.moduleId}`}>
                        Continue
                        <ArrowRight data-icon="inline-end" aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                    <BookOpen className="size-8 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve completed all modules. Incredible work!
                    </p>
                  </CardContent>
                </Card>
              )}
              {recentLessons.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    Recently Completed
                  </p>
                  {recentLessons.map(({ lesson }) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 border border-border bg-card px-4 py-3"
                    >
                      <BookOpen
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <p className="flex-1 truncate text-sm">{lesson.title}</p>
                      <Clock className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Achievements
                </h2>
                {achievements.total > 0 && (
                  <Link
                    href="/achievements"
                    className="text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View all
                  </Link>
                )}
              </div>
              {recentAchievements.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {recentAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 border border-border bg-card px-4 py-3"
                    >
                      <span className="text-xl" role="img" aria-label={achievement.name}>
                        {achievement.icon}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="truncate text-sm font-semibold">{achievement.name}</p>
                        <p
                          className={`text-xs uppercase tracking-widest ${getTierColor(achievement.tier)}`}
                        >
                          {achievement.tier}
                        </p>
                      </div>
                      <Trophy
                        className={`size-3.5 shrink-0 ${getTierColor(achievement.tier)}`}
                        aria-hidden="true"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                    <Trophy className="size-7 text-muted-foreground" aria-hidden="true" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Complete your first lesson to earn achievements
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              All Modules
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => {
                const isLocked = module.completionPercentage === 0;
                return (
                  <Card key={module.moduleId} className={isLocked ? "opacity-60" : undefined}>
                    <CardContent className="flex flex-col gap-3 pt-8">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`font-heading text-xs font-semibold tracking-widest uppercase ${isLocked ? "text-muted-foreground/60" : "text-foreground"}`}
                        >
                          {module.moduleTitle}
                        </p>
                        <span
                          className={`font-heading text-sm font-semibold ${module.completionPercentage === 100 ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {module.completionPercentage}%
                        </span>
                      </div>
                      <Progress
                        value={module.completionPercentage}
                        aria-label={`${module.completionPercentage}% of ${module.moduleTitle} complete`}
                      />
                      <p className="text-xs text-muted-foreground">
                        {module.lessonsCompleted}/{module.lessonsTotal} lessons
                        {module.projectsTotal > 0 &&
                          ` · ${module.projectsCompleted}/${module.projectsTotal} projects`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
