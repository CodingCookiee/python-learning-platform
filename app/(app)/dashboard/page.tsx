import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer } from "@/components/animations";
import {
  CircularProgress,
  AnimatedProgressBar,
  ModuleProgressCard,
  AnimatedNumber,
} from "@/components/progress";
import { StreakDisplay } from "@/components/gamification/streak-display";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import { LevelBadge } from "@/components/gamification/level-badge";
import { MilestoneTracker } from "@/components/gamification/milestone-tracker";
import { BookOpen, Trophy, Flame, ArrowRight, Clock } from "lucide-react";

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
    activeDates: string[];
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
    modulePhase: string;
  }>;
  recentActivity: {
    lessons: Array<{
      lesson: { id: string; title: string; moduleId: string; order: number };
      completedAt: string | Date | null;
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

async function getProgressData(userId: string): Promise<ProgressData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, xp: true, level: true },
    });
    if (!user) return null;

    const [completedLessons, passedExercises, approvedProjects, unlockedAchievements] =
      await Promise.all([
        prisma.progress.findMany({
          where: { userId, completed: true },
          include: { lesson: { select: { id: true, title: true, moduleId: true, order: true } } },
        }),
        prisma.exerciseSubmission.findMany({
          where: { userId, passed: true },
          distinct: ["exerciseId"],
          select: { exerciseId: true, submittedAt: true },
        }),
        prisma.projectSubmission.findMany({
          where: { userId, status: "approved" },
          include: {
            project: { select: { id: true, title: true, moduleId: true, xpReward: true } },
          },
        }),
        prisma.userAchievement.findMany({
          where: { userId },
          include: { achievement: true },
          orderBy: { unlockedAt: "desc" },
        }),
      ]);

    let streak = await prisma.streak.findUnique({ where: { userId } });
    if (!streak)
      streak = await prisma.streak.create({
        data: { userId, currentStreak: 0, longestStreak: 0, lastActivityDate: new Date() },
      });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 84);
    cutoff.setHours(0, 0, 0, 0);
    const [rp, re] = await Promise.all([
      prisma.progress.findMany({
        where: { userId, completed: true, completedAt: { gte: cutoff } },
        select: { completedAt: true },
      }),
      prisma.exerciseSubmission.findMany({
        where: { userId, passed: true, submittedAt: { gte: cutoff } },
        select: { submittedAt: true },
      }),
    ]);
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    };
    const ads = new Set<string>();
    for (const p of rp) if (p.completedAt) ads.add(fmt(new Date(p.completedAt)));
    for (const e of re) ads.add(fmt(new Date(e.submittedAt)));
    const activeDates = Array.from(ads).sort();

    const [tL, tP] = await Promise.all([prisma.lesson.count(), prisma.project.count()]);
    const denom = tL + tP;
    const completion = {
      lessons: {
        completed: completedLessons.length,
        total: tL,
        percentage: tL > 0 ? Math.round((completedLessons.length / tL) * 100) : 0,
      },
      exercises: { completed: passedExercises.length, total: 0, percentage: 0 },
      projects: {
        completed: approvedProjects.length,
        total: tP,
        percentage: tP > 0 ? Math.round((approvedProjects.length / tP) * 100) : 0,
      },
      overall:
        denom > 0
          ? Math.round(((completedLessons.length + approvedProjects.length) / denom) * 100)
          : 0,
    };

    const mods = await prisma.module.findMany({
      orderBy: { order: "asc" },
      include: { lessons: { select: { id: true } }, projects: { select: { id: true } } },
    });
    const moduleProgress = mods.map((mod) => {
      const lIds = mod.lessons.map((l) => l.id),
        pIds = mod.projects.map((p) => p.id);
      const done = completedLessons.filter((cl) => lIds.includes(cl.lesson.id)).length,
        doneP = approvedProjects.filter((ap) => pIds.includes(ap.project.id)).length;
      const tot = mod.lessons.length + mod.projects.length;
      return {
        moduleId: mod.id,
        moduleTitle: mod.title,
        modulePhase: mod.phase,
        lessonsCompleted: done,
        lessonsTotal: mod.lessons.length,
        projectsCompleted: doneP,
        projectsTotal: mod.projects.length,
        completionPercentage: tot > 0 ? Math.round(((done + doneP) / tot) * 100) : 0,
      };
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level },
      streak: {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        lastActivity: streak.lastActivityDate,
        activeDates,
      },
      completion,
      modules: moduleProgress,
      recentActivity: {
        lessons: completedLessons.slice(-5).reverse(),
        projects: approvedProjects.slice(-3).reverse(),
      },
      achievements: {
        unlocked: unlockedAchievements.map((ua) => ({
          id: ua.achievement.id,
          name: ua.achievement.name,
          description: ua.achievement.description,
          icon: ua.achievement.icon,
          category: ua.achievement.category,
          tier: ua.achievement.tier,
          xpReward: ua.achievement.xpReward,
          unlockedAt: ua.unlockedAt,
        })),
        total: unlockedAchievements.length,
      },
    };
  } catch (err) {
    console.error("Dashboard data error:", err);
    return null;
  }
}

function phaseToNumber(phase: string): number {
  const p = phase.toLowerCase();
  if (p === "1" || p.includes("foundation")) return 1;
  if (p === "2" || p.includes("intermediate")) return 2;
  if (p === "3" || p.includes("advanced")) return 3;
  if (p === "4" || p.includes("applied")) return 4;
  const n = parseInt(phase);
  return isNaN(n) ? 1 : n;
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

const roadmapPhases = [
  { phase: "Phase 2", label: "Intermediate", modules: "Modules 4-7", weeks: "Week 2" },
  { phase: "Phase 3", label: "Advanced Python", modules: "Modules 8-10", weeks: "Week 3" },
  { phase: "Phase 4", label: "Applied Python", modules: "Modules 11-16", weeks: "Week 4" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const dbUser = await prisma.user.findUnique({
    where: { email: session?.user?.email ?? "" },
    select: { id: true },
  });
  if (!dbUser) redirect("/auth/signin");

  const data = await getProgressData(dbUser.id);

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
            <LevelBadge level={user.level} size="sm" className="mt-2 sm:mt-0" />
          </div>
        </FadeIn>
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Overall Progress */}
            <Card>
              <CardContent className="flex flex-col items-center gap-3 pt-8">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground self-start">
                  Overall Progress
                </p>
                <CircularProgress
                  value={completion.overall}
                  label="overall"
                  size={80}
                  strokeWidth={6}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-8">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Current Streak
                </p>
                <StreakDisplay currentStreak={streak.current} longestStreak={streak.longest} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-3 pt-8">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Lessons Done
                </p>
                <p className="font-heading text-3xl font-semibold">
                  <AnimatedNumber value={completion.lessons.completed} />
                  <span className="text-lg font-normal text-muted-foreground">
                    /{completion.lessons.total}
                  </span>
                </p>
                <AnimatedProgressBar
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
                <XpProgressBar xp={user.xp} level={user.level} />
              </CardContent>
            </Card>
          </div>
        </FadeIn>

        {/* Streak calendar */}
        <FadeIn delay={0.07}>
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Activity
              </p>
              <StreakCalendar activeDates={streak.activeDates ?? []} />
            </CardContent>
          </Card>
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
                          Phase {phaseToNumber(currentModule.modulePhase ?? "")}
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
                      <AnimatedProgressBar
                        value={currentModule.completionPercentage}
                        className="h-1.5"
                        aria-label={`${currentModule.completionPercentage}% of module complete`}
                        delay={0.15}
                        showLabel={false}
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
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-muted-foreground">
                        You&apos;ve completed the currently released modules. The roadmap below
                        shows the remaining weeks in this 3-4 week sprint.
                      </p>
                      <div className="grid gap-2 text-left sm:grid-cols-3">
                        {roadmapPhases.map((phase) => (
                          <div
                            key={phase.phase}
                            className="border border-border bg-muted/30 px-3 py-2"
                          >
                            <p className="font-heading text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                              {phase.phase}
                            </p>
                            <p className="text-sm font-medium">{phase.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {phase.modules} · {phase.weeks}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
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
              {modules.map((module) => (
                <ModuleProgressCard
                  key={module.moduleId}
                  moduleId={module.moduleId}
                  title={module.moduleTitle}
                  phase={phaseToNumber(module.modulePhase ?? "")}
                  completionPercentage={module.completionPercentage}
                  lessonsCompleted={module.lessonsCompleted}
                  lessonsTotal={module.lessonsTotal}
                  projectsCompleted={module.projectsCompleted}
                  projectsTotal={module.projectsTotal}
                  isLocked={module.completionPercentage === 0}
                />
              ))}
            </div>
          </div>
        </FadeIn>
        <MilestoneTracker overallPercentage={completion.overall} />
      </StaggerContainer>
    </div>
  );
}
