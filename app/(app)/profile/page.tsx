import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { initialsFor } from "@/lib/utils";
import Link from "next/link";
import { auth } from "@/auth";
import { getProgressSummary } from "@/lib/progress-summary";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";
import { StreakDisplay } from "@/components/gamification/streak-display";
import { ProfileCard } from "./_components/profile-card";
import { Check } from "lucide-react";
import { RankCard } from "@/components/brand/rank-card";
import { AchievementPatch } from "@/components/gamification/achievement-badge";
import { SealMark, TapeMark } from "@/components/brand/marks";
import { rankFromTracks } from "@/lib/learner-rank";
import { getCurriculumState, PYTHON_TRACK } from "@/lib/curriculum-state";
import { blackBeltIfDue } from "@/lib/black-belt";
import { tierStyle } from "@/lib/achievement-tier";
import { getCertificateStates } from "@/lib/certificates";
import { publicOrigin } from "@/lib/public-origin";
import { CertificatesSection } from "@/components/certificates/certificates-section";
import { StreakCalendar } from "@/components/gamification/streak-calendar";
import { SkillMap } from "@/components/mastery/skill-map";
import { getSkillMap } from "@/lib/skill-map";
import { EmptySlot } from "@/components/brand/empty-slot";

export const metadata: Metadata = { title: "Profile" };

function formatDate(d: string | Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  // Read directly, not through our own API over HTTP: one less round trip, and no Host header.
  // An account that no longer exists ends the stale session; any other failure (a database blip)
  // reaches the error page, rather than quietly sending the learner somewhere else
  const data = await getProgressSummary(session.user.id).catch((error: unknown) => {
    if (error instanceof Error && error.message === "User not found") return null;
    throw error;
  });
  if (!data) redirect("/auth/session-ended");

  const { user, streak, completion, recentActivity, achievements } = data;
  // One read of the curriculum for the rank and the certificates
  const tracks = await getCurriculumState(user.id);
  const [blackBelt, certificates, skills] = await Promise.all([
    blackBeltIfDue(user.id, tracks),
    getCertificateStates(user.id, tracks),
    getSkillMap(user.id),
  ]);
  const rank = rankFromTracks(tracks, blackBelt);
  const pythonModules = tracks.find((t) => t.slug === PYTHON_TRACK)?.modules ?? [];
  const pythonLessons = pythonModules.reduce(
    (n, m) => ({ done: n.done + m.lessonsDone, total: n.total + m.lessonsTotal }),
    { done: 0, total: 0 }
  );
  const initials = initialsFor(user.name, user.email);
  const recentAchievements = achievements.unlocked.slice(0, 6);
  const recentLessons = recentActivity.lessons.slice(0, 6);

  return (
    <div className="mx-auto max-w-page px-gutter py-8 sm:py-12">
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

        <FadeIn delay={0.06}>
          <CertificatesSection
            states={certificates}
            defaultName={user.name ?? ""}
            origin={publicOrigin()}
          />
        </FadeIn>

        {/* Training record: ruled facts, not stat cards */}
        <FadeIn delay={0.08}>
          <section aria-labelledby="record-heading" className="flex flex-col gap-5">
            <h2 id="record-heading" className="scroll-mt-24 text-xl font-semibold">
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
                <dt className="text-sm text-muted-foreground">Python lessons finished</dt>
                <dd className="font-condensed tabular leading-none">
                  <span className="text-3xl font-extrabold">{pythonLessons.done}</span>
                  <span className="text-lg font-bold text-muted-foreground">
                    {" "}
                    / {pythonLessons.total}
                  </span>
                </dd>
              </div>
              {/* Not "of 24": the black belt asks for three, and every capstone is optional practice beyond */}
              <div className="flex items-end justify-between gap-4 border-b border-border py-5">
                <dt className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  Capstone projects approved
                  <span className="text-xs">The black belt takes three Python capstones.</span>
                </dt>
                <dd className="font-condensed tabular text-3xl leading-none font-extrabold">
                  {completion.projects.completed}
                </dd>
              </div>
            </dl>
          </section>
        </FadeIn>

        <FadeIn delay={0.1}>
          <section aria-labelledby="log-heading" className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="log-heading" className="text-xl font-semibold">
                Training log
              </h2>
              <Link href="/log" className="text-sm font-medium text-primary underline">
                Weekly check-ins
              </Link>
            </div>
            <StreakCalendar activeDates={streak.activeDates ?? []} />
          </section>
        </FadeIn>

        {skills.modules.length > 0 && (
          <FadeIn delay={0.11}>
            <section aria-labelledby="skills-heading" className="flex flex-col gap-5">
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
                <EmptySlot mark={<SealMark />}>
                  Finish your first lesson to earn your first achievement.
                </EmptySlot>
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
                    <li
                      key={lesson.id}
                      className="flex items-center gap-3 border-b border-border py-3"
                    >
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
                <EmptySlot mark={<TapeMark />}>Lessons you finish show up here.</EmptySlot>
              )}
            </section>
          </FadeIn>
        </div>
      </StaggerContainer>
    </div>
  );
}
