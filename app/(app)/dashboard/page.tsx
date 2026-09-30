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
import { ArrowRight, Check, Repeat } from "lucide-react";
import { SealMark } from "@/components/brand/marks";
import { AchievementPatch } from "@/components/gamification/achievement-badge";
import { tierStyle } from "@/lib/achievement-tier";
import { RankCard } from "@/components/brand/rank-card";
import { getLearnerRank } from "@/lib/learner-rank";
import { getSyllabusProgress } from "@/lib/syllabus";
import { SyllabusProgress } from "@/components/brand/syllabus-progress";
import { SkillMap } from "@/components/mastery/skill-map";
import { getSkillMap } from "@/lib/skill-map";
import { countDueReviews } from "@/lib/review";
import { getPace, startOfWeek } from "@/lib/pacing";

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
          where: { userId, completed: true, lesson: { archivedAt: null } },
          include: { lesson: { select: { id: true, title: true, moduleId: true, order: true } } },
        }),
        prisma.exerciseSubmission.findMany({
          where: { userId, passed: true, exercise: { archivedAt: null } },
          distinct: ["exerciseId"],
          select: { exerciseId: true, submittedAt: true },
        }),
        prisma.projectSubmission.findMany({
          where: { userId, status: "approved", project: { archivedAt: null } },
          include: {
            project: { select: { id: true, title: true, moduleId: true, xpReward: true } },
          },
        }),
        prisma.userAchievement.findMany({
          where: { userId, achievement: { archivedAt: null } },
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

    // Totals cover live content only (archived lessons and projects no longer count)
    const [tL, tP] = await Promise.all([
      prisma.lesson.count({ where: { archivedAt: null, module: { archivedAt: null, trackId: { not: null } } } }),
      prisma.project.count({ where: { archivedAt: null, module: { archivedAt: null, trackId: { not: null } } } }),
    ]);
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
      where: { archivedAt: null, trackId: { not: null } },
      orderBy: [{ track: { order: "asc" } }, { order: "asc" }],
      include: {
        lessons: { where: { archivedAt: null }, select: { id: true } },
        projects: { where: { archivedAt: null }, select: { id: true } },
      },
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
    select: { id: true, onboardedAt: true, experience: true },
  });
  if (!dbUser) redirect("/auth/signin");
  // First visit: three questions before the first lesson
  if (!dbUser.onboardedAt) redirect("/onboarding");

  const [data, rank, syllabus] = await Promise.all([
    getProgressData(dbUser.id),
    getLearnerRank(dbUser.id),
    getSyllabusProgress(dbUser.id),
  ]);
  const [skills, reviewsDue, pace, checkIn] = await Promise.all([
    getSkillMap(dbUser.id),
    countDueReviews(dbUser.id),
    getPace(dbUser.id),
    prisma.learningLogEntry.findUnique({
      where: { userId_weekOf: { userId: dbUser.id, weekOf: startOfWeek() } },
      select: { id: true },
    }),
  ]);
  const current = syllabus.find((m) => m.state === "current");
  // Learners who already code can test out of the module in front of them
  const suggestPlacement = dbUser.experience !== "new" && current && current.lessonsDone === 0 && !current.checkpointDue;
  const weekPct = Math.min(100, (pace.hoursThisWeek / pace.weeklyHours) * 100);

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

        <FadeIn delay={0.065}>
          <section aria-labelledby="week-heading" className="grid gap-x-10 gap-y-4 rounded-md border border-border p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="week-heading" className="font-semibold">
                  This week
                </h2>
                <Link href="/onboarding" className="text-sm text-muted-foreground underline hover:text-foreground">
                  Change plan
                </Link>
              </div>
              <p className="font-condensed tabular leading-none">
                <span className="text-3xl font-extrabold">{pace.hoursThisWeek}</span>
                <span className="text-lg font-bold text-muted-foreground"> / {pace.weeklyHours} h</span>
              </p>
              <span className="h-2 overflow-hidden rounded-[2px] bg-muted" aria-hidden="true">
                <span className="block h-full bg-primary" style={{ width: `${weekPct}%` }} />
              </span>
              <p className="text-xs text-muted-foreground">Estimated from lessons, drills, reviews and checkpoints this week.</p>
              <Link href="/log" className="w-fit text-sm font-medium text-primary underline">
                {checkIn ? "This week's check-in is saved" : "Write this week's check-in"}
              </Link>
            </div>
            <p className="text-[0.9875rem] leading-relaxed text-muted-foreground">
              {pace.projectedFinish ? (
                <>
                  About <span className="font-semibold text-foreground">{pace.hoursLeft} hours</span> of training to{" "}
                  {pace.goalLabel}. At {pace.weeklyHours} h a week that&apos;s around{" "}
                  <span className="font-semibold text-foreground">
                    {new Date(pace.projectedFinish).toLocaleDateString([], { month: "long", year: "numeric" })}
                  </span>
                  .
                </>
              ) : (
                <>You&apos;ve reached {pace.goalLabel}. Keep your reviews going so it stays sharp.</>
              )}
              {suggestPlacement && current && (
                <>
                  {" "}
                  Already comfortable with <span className="font-semibold text-foreground">{current.title}</span>?{" "}
                  <Link href={`/modules/${current.id}#checkpoint-heading`} className="font-medium text-primary underline">
                    Test out with its checkpoint
                  </Link>
                  .
                </>
              )}
            </p>
          </section>
        </FadeIn>

        {reviewsDue > 0 && (
          <FadeIn delay={0.07}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md border border-border bg-accent/45 px-5 py-4">
              <Repeat className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="min-w-0 flex-1">
                <span className="font-semibold">
                  {reviewsDue} {reviewsDue === 1 ? "drill is" : "drills are"} due for review.
                </span>{" "}
                <span className="text-muted-foreground">Solve them again from memory to keep them.</span>
              </p>
              <Button asChild>
                <Link href="/review">
                  Review now
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </FadeIn>
        )}

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

        {skills.modules.length > 0 && (
          <FadeIn delay={0.11}>
            <section aria-labelledby="skills-heading" className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="skills-heading" className="text-xl font-semibold">
                  Skill map
                </h2>
                <Link href="/review" className="text-sm font-medium text-primary underline">
                  Review queue
                </Link>
              </div>
              <SkillMap map={skills} />
            </section>
          </FadeIn>
        )}

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
