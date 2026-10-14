import type { Metadata } from "next";
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
import { OnRampCard, StreakGoal } from "@/components/onramp/onramp-card";
import { getOnRamp } from "@/lib/onramp";
import { getQuest, questCard } from "@/lib/quest";
import { QuestOffer } from "@/components/quest/quest-offer";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { RankCard } from "@/components/brand/rank-card";
import { MilestoneTracker } from "@/components/gamification/milestone-tracker";
import { getLearnerRank } from "@/lib/learner-rank";
import { getSyllabusProgress } from "@/lib/syllabus";
import { SyllabusProgress } from "@/components/brand/syllabus-progress";
import { countDueReviews } from "@/lib/review";
import { getPace, startOfWeek } from "@/lib/pacing";
import { getNextStep } from "@/lib/next-step";
import { CertificateBand, NextBand } from "@/components/dashboard/next-band";
import { claimableCertificate } from "@/lib/certificates";
import { getBeltTestOut } from "@/lib/checkpoint";
import { publicOrigin } from "@/lib/public-origin";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * What the dashboard itself shows: who you are, your streak, and whether you've started. The record
 * (training log, achievements, skill map, recent lessons, milestones) lives on the profile.
 */
interface DashboardData {
  user: { id: string; name: string | null; xp: number; level: number };
  streak: { current: number; longest: number };
  /** Nothing finished yet: a first visit isn't a return */
  firstVisit: boolean;
  /** Lessons and approved capstones over all live ones, for the 25/50/75/100% celebrations */
  overall: number;
}

/** Live content in a track (archived rows and pre-content legacy modules don't count) */
const LIVE_MODULE = { archivedAt: null, trackId: { not: null } } as const;

async function getDashboardData(userId: string): Promise<DashboardData | null> {
  try {
    const [user, streak, lessonsDone, drill, capstonesDone, lessonsTotal, capstonesTotal] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, xp: true, level: true } }),
      prisma.streak.findUnique({ where: { userId }, select: { currentStreak: true, longestStreak: true } }),
      prisma.progress.count({ where: { userId, completed: true, lesson: { archivedAt: null, module: LIVE_MODULE } } }),
      prisma.exerciseSubmission.findFirst({ where: { userId, passed: true }, select: { id: true } }),
      prisma.projectSubmission.count({ where: { userId, status: "approved", project: { archivedAt: null, module: LIVE_MODULE } } }),
      prisma.lesson.count({ where: { archivedAt: null, module: LIVE_MODULE } }),
      prisma.project.count({ where: { archivedAt: null, module: LIVE_MODULE } }),
    ]);
    if (!user) return null;
    const total = lessonsTotal + capstonesTotal;
    return {
      user,
      streak: { current: streak?.currentStreak ?? 0, longest: streak?.longestStreak ?? 0 },
      firstVisit: lessonsDone === 0 && !drill,
      overall: total > 0 ? Math.round(((lessonsDone + capstonesDone) / total) * 100) : 0,
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
  // Signed in as an account that no longer exists: clear the stale session (else a redirect loop)
  if (!dbUser) redirect("/auth/session-ended");
  // First visit: three questions before the first lesson
  if (!dbUser.onboardedAt) redirect("/onboarding");

  const [data, rank, syllabus] = await Promise.all([
    getDashboardData(dbUser.id),
    getLearnerRank(dbUser.id),
    getSyllabusProgress(dbUser.id),
  ]);
  const [reviewsDue, pace, checkIn, onRamp, quest] = await Promise.all([
    countDueReviews(dbUser.id),
    getPace(dbUser.id),
    prisma.learningLogEntry.findUnique({
      where: { userId_weekOf: { userId: dbUser.id, weekOf: startOfWeek() } },
      select: { id: true },
    }),
    getOnRamp(dbUser.id),
    getQuest(dbUser.id),
  ]);
  // Beginners, and anyone who has started it, see the Start on-ramp first until it's finished
  const showOnRamp = onRamp?.showOnDashboard ?? false;
  const current = syllabus.find((m) => m.state === "current");
  // Learners who already code can test out of the module in front of them
  const suggestPlacement = dbUser.experience !== "new" && current && current.lessonsDone === 0 && !current.checkpointDue;
  // ...or the rest of the belt in one sitting
  const beltOffer = suggestPlacement && current ? await getBeltTestOut(dbUser.id, current.id) : null;
  const questOffer = questCard(quest);
  const weekPct = Math.min(100, (pace.hoursThisWeek / pace.weeklyHours) * 100);
  // One slot at the top for the one thing to do next: due reviews and a running grading come first,
  // then a certificate to claim, then the beginner on-ramp, then the exact next lesson or drill. The
  // quest offer is never in it: a slim row underneath, so Continue is always at the top
  const [next, claimable] = await Promise.all([
    getNextStep(dbUser.id, syllabus, reviewsDue),
    claimableCertificate(dbUser.id, rank.modulesPassed),
  ]);
  const slot =
    next.kind === "reviews" || next.kind === "checkpoint-open"
      ? "next"
      : claimable
        ? "certificate"
        : showOnRamp && onRamp
          ? "onramp"
          : "next";

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

  const { user, streak, firstVisit, overall } = data;
  const passedCount = syllabus.filter((m) => m.state === "passed").length;
  const pythonLessons = syllabus.reduce((n, m) => ({ done: n.done + m.lessonsDone, total: n.total + m.lessonsTotal }), { done: 0, total: 0 });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <header className="flex flex-col gap-2">
            <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em]">
              {firstVisit ? "Welcome" : "Welcome back"}
              {user.name ? `, ${user.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              {passedCount} of {syllabus.length} modules passed. One lesson a day keeps the streak
              and the stripes coming.
            </p>
          </header>
        </FadeIn>

        {/* The one thing to do next. The first-session quest (offered once to learners who never had
            it, resumable when skipped midway) sits under it as a slim row */}
        <FadeIn delay={0.02} className="flex flex-col gap-4">
          {slot === "certificate" && claimable ? (
            <CertificateBand track={claimable} defaultName={user.name ?? ""} origin={publicOrigin()} />
          ) : slot === "onramp" && onRamp ? (
            <OnRampCard onRamp={onRamp} />
          ) : (
            <NextBand next={next} />
          )}
          {questOffer && <QuestOffer kind={questOffer} done={quest?.completed.length ?? 0} />}
        </FadeIn>
        <FadeIn delay={0.04}>
          {/* The quest's last step points at the belt, the streak and the XP in turn */}
          <div data-quest-target="belt">
            <RankCard rank={rank} showAction={false} />
          </div>
        </FadeIn>

        <FadeIn delay={0.06}>
          <dl className="grid gap-x-10 border-y border-border md:grid-cols-3">
            <div data-quest-target="streak" className="flex flex-col gap-3 border-b border-border py-5 md:border-b-0">
              <dt className="text-sm text-muted-foreground">Streak</dt>
              <dd>
                <StreakDisplay currentStreak={streak.current} longestStreak={streak.longest} size="sm" />
                {showOnRamp && <StreakGoal current={streak.current} />}
              </dd>
            </div>
            <div data-quest-target="xp" className="flex flex-col gap-3 border-b border-border py-5 md:border-b-0">
              <dt className="text-sm text-muted-foreground">
                Level {user.level} · {user.xp.toLocaleString()} XP
              </dt>
              <dd>
                <XpProgressBar xp={user.xp} level={user.level} />
              </dd>
            </div>
            <div className="flex flex-col gap-3 py-5">
              {/* Counted in the Python syllabus, the same 108 the landing page names, not every track at once */}
              <dt className="text-sm text-muted-foreground">Python lessons finished</dt>
              <dd className="font-condensed tabular leading-none">
                <span className="text-3xl font-extrabold">
                  <AnimatedNumber value={pythonLessons.done} />
                </span>
                <span className="text-lg font-bold text-muted-foreground"> / {pythonLessons.total}</span>
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
              <p className="text-xs text-muted-foreground">Estimated from lessons, drills, reviews and gradings this week.</p>
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
                pace.blackBeltPending ? (
                  <>
                    Every module is passed. What&apos;s left is the black belt grading on the card above: advanced topics
                    held through reviews, and three approved capstones.
                  </>
                ) : (
                  <>You&apos;ve reached {pace.goalLabel}. Keep your reviews going so it stays sharp.</>
                )
              )}
              {suggestPlacement && current && (
                <>
                  {" "}
                  Already comfortable with <span className="font-semibold text-foreground">{current.title}</span>?{" "}
                  <Link href={`/modules/${current.id}#checkpoint-heading`} className="font-medium text-primary underline">
                    Test out with its grading
                  </Link>
                  {beltOffer?.status === "available" ? (
                    <>
                      , or{" "}
                      <Link href={`/modules/${current.id}#belt-test-out-heading`} className="font-medium text-primary underline">
                        the whole {beltOffer.belt.label.toLowerCase()} in one sitting
                      </Link>
                    </>
                  ) : null}
                  .
                </>
              )}
            </p>
          </section>
        </FadeIn>


        <FadeIn delay={0.08}>
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
        {/* The record (training log, achievements, skill map, recent lessons) is the profile's, one link away */}
        <FadeIn delay={0.1}>
          <p className="border-t border-border pt-6 text-sm text-muted-foreground">
            Your training log, achievements, skill map and recent lessons are on{" "}
            <Link href="/profile#record-heading" className="font-medium text-primary underline">
              your record
            </Link>
            .
          </p>
        </FadeIn>
        <MilestoneTracker overallPercentage={overall} />
      </StaggerContainer>
    </div>
  );
}
