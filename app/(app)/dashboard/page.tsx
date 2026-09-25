import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer } from "@/components/animations";
import {
  AnimatedNumber,
} from "@/components/progress";
import { StreakDisplay } from "@/components/gamification/streak-display";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import { MilestoneTracker } from "@/components/gamification/milestone-tracker";
import { Check } from "lucide-react";
import { SealMark } from "@/components/brand/marks";
import { AchievementPatch } from "@/components/gamification/achievement-badge";
import { tierStyle } from "@/lib/achievement-tier";
import { RankCard } from "@/components/brand/rank-card";
import { getLearnerRank } from "@/lib/learner-rank";
import { getSyllabusProgress } from "@/lib/syllabus";
import { SyllabusProgress } from "@/components/brand/syllabus-progress";

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
    // Same sources as the streak: lessons, passed drills, approved capstones
    const [rp, re, rc] = await Promise.all([
      prisma.progress.findMany({
        where: { userId, completed: true, completedAt: { gte: cutoff } },
        select: { completedAt: true },
      }),
      prisma.exerciseSubmission.findMany({
        where: { userId, passed: true, submittedAt: { gte: cutoff } },
        select: { submittedAt: true },
      }),
      prisma.projectSubmission.findMany({
        where: { userId, status: "approved", evaluatedAt: { gte: cutoff } },
        select: { evaluatedAt: true },
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
    for (const c of rc) if (c.evaluatedAt) ads.add(fmt(new Date(c.evaluatedAt)));
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

  const [data, rank, syllabus] = await Promise.all([
    getProgressData(dbUser.id),
    getLearnerRank(dbUser.id),
    getSyllabusProgress(dbUser.id),
  ]);

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

  const { user, streak, completion, recentActivity, achievements } = data;
  const recentLessons = recentActivity.lessons.slice(0, 6);
  const recentAchievements = achievements.unlocked.slice(0, 4);
  const passedCount = syllabus.filter((m) => m.state === "passed").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <header className="flex flex-col gap-2">
            <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em]">
              Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="text-muted-foreground">
              {passedCount} of {syllabus.length} modules passed. One lesson a day keeps the streak
              and the stripes coming.
            </p>
          </header>
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

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <FadeIn delay={0.08}>
            <section aria-labelledby="log-heading" className="flex flex-col gap-4">
              <h2 id="log-heading" className="text-xl font-semibold">
                Training log
              </h2>
              <StreakCalendar activeDates={streak.activeDates ?? []} />
            </section>
          </FadeIn>

          <FadeIn delay={0.1}>
            <section aria-labelledby="ach-heading" className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="ach-heading" className="text-xl font-semibold">
                  Recent achievements
                </h2>
                <Link href="/achievements" className="text-sm font-medium text-primary underline">
                  All achievements
                </Link>
              </div>
              {recentAchievements.length > 0 ? (
                <ul className="flex flex-col border-t border-border">
                  {recentAchievements.map((a) => (
                    <li key={a.id} className="flex items-center gap-4 border-b border-border py-3">
                      <AchievementPatch icon={a.icon} tier={a.tier} size="sm" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">{a.name}</span>
                        <span className="font-condensed tabular text-xs text-muted-foreground">
                          {tierStyle(a.tier).label} · {a.xpReward} XP
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
        </div>

        {recentLessons.length > 0 && (
          <FadeIn delay={0.12}>
            <section aria-labelledby="recent-heading" className="flex flex-col gap-4">
              <h2 id="recent-heading" className="text-xl font-semibold">
                Recently finished
              </h2>
              <ol className="grid border-t border-border sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
                {recentLessons.map(({ lesson }) => (
                  <li key={lesson.id} className="border-b border-border">
                    <Link
                      href={`/lessons/${lesson.id}`}
                      className="flex items-center gap-3 py-3 hover:text-primary"
                    >
                      <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                      <span className="truncate">{lesson.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          </FadeIn>
        )}

        <FadeIn delay={0.14}>
          <section aria-labelledby="syllabus-heading" className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="syllabus-heading" className="text-xl font-semibold">
                Your current belt
              </h2>
              <Link href="/modules" className="text-sm font-medium text-primary underline">
                The full syllabus
              </Link>
            </div>
            <SyllabusProgress modules={syllabus} compact onlyCurrentBelt />
          </section>
        </FadeIn>
        <MilestoneTracker overallPercentage={completion.overall} />
      </StaggerContainer>
    </div>
  );
}
