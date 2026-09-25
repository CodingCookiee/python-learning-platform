import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer } from "@/components/animations";
import {
  ModuleProgressCard,
  AnimatedNumber,
} from "@/components/progress";
import { StreakDisplay } from "@/components/gamification/streak-display";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import { MilestoneTracker } from "@/components/gamification/milestone-tracker";
import { Check } from "lucide-react";
import { SealMark, StreakMark } from "@/components/brand/marks";
import { AchievementPatch } from "@/components/gamification/achievement-badge";
import { tierStyle } from "@/lib/achievement-tier";
import { RankCard } from "@/components/brand/rank-card";
import { getLearnerRank } from "@/lib/learner-rank";

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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const dbUser = await prisma.user.findUnique({
    where: { email: session?.user?.email ?? "" },
    select: { id: true },
  });
  if (!dbUser) redirect("/auth/signin");

  const [data, rank] = await Promise.all([getProgressData(dbUser.id), getLearnerRank(dbUser.id)]);

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
  const recentLessons = recentActivity.lessons.slice(0, 3);
  const recentAchievements = achievements.unlocked.slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
              </h1>
              <p className="text-sm text-muted-foreground">
                Keep going — you&apos;re {completion.overall}% of the way through the curriculum.
              </p>
            </div>
            <span className="font-condensed tabular mt-2 inline-flex w-fit items-center gap-1.5 rounded-sm border border-border bg-sheet px-2 py-1 text-sm font-semibold sm:mt-0">
              <StreakMark className={streak.current > 0 ? "text-primary" : "text-muted-foreground"} />
              {streak.current} {streak.current === 1 ? "day" : "days"} in a row
            </span>
          </div>
        </FadeIn>
        <FadeIn delay={0.04}>
          <RankCard rank={rank} />
        </FadeIn>

        <FadeIn delay={0.06}>
          <dl className="grid gap-x-10 border-y border-border md:grid-cols-3">
            <div className="flex flex-col gap-3 border-b border-border py-5 md:border-b-0">
              <dt className="text-sm text-muted-foreground">Streak</dt>
              <dd>
                <StreakDisplay currentStreak={streak.current} longestStreak={streak.longest} size="sm" />
              </dd>
            </div>
            <div className="flex flex-col gap-3 border-b border-border py-5 md:border-b-0">
              <dt className="text-sm text-muted-foreground">
                Level {user.level} · {user.xp.toLocaleString()} XP
              </dt>
              <dd>
                <XpProgressBar xp={user.xp} level={user.level} />
              </dd>
            </div>
            <div className="flex flex-col gap-3 py-5">
              <dt className="text-sm text-muted-foreground">Lessons finished</dt>
              <dd className="font-condensed tabular leading-none">
                <span className="text-3xl font-extrabold">
                  <AnimatedNumber value={completion.lessons.completed} />
                </span>
                <span className="text-lg font-bold text-muted-foreground"> / {completion.lessons.total}</span>
              </dd>
            </div>
          </dl>
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
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                      <p className="flex-1 truncate text-sm">{lesson.title}</p>
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
                      <AchievementPatch icon={achievement.icon} tier={achievement.tier} size="sm" />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="truncate text-sm font-semibold">{achievement.name}</p>
                        <p className="font-condensed text-xs text-muted-foreground">
                          {tierStyle(achievement.tier).label} · {achievement.xpReward} XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                    <SealMark className="size-7 text-muted-foreground" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Finish your first lesson to earn your first patch.
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
                  phase={module.modulePhase}
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
