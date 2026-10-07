import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { RankCard } from "@/components/brand/rank-card";
import { SyllabusProgress } from "@/components/brand/syllabus-progress";
import { LockedMark, SealMark } from "@/components/brand/marks";
import {
  AUTOMATION_TRACK,
  AUTOMATION_UNLOCK_AFTER,
  getCurriculumState,
  PYTHON_TRACK,
  START_TRACK,
  type ModuleProgress,
} from "@/lib/curriculum-state";
import { rankFromTracks } from "@/lib/learner-rank";
import { blackBeltIfDue } from "@/lib/black-belt";
import { toSyllabus, type SyllabusModule } from "@/lib/syllabus";
import { DAN_TRACK, ordinal } from "@/lib/ranks";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Syllabus" };

/** The on-ramp's status: no grade, so it's done, in progress, or an optional few hours */
function StartStatus({ module }: { module: ModuleProgress }) {
  if (module.passed)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
        <SealMark className="size-4" />
        Done
      </span>
    );
  if (module.lessonsDone > 0)
    return (
      <span className="font-condensed tabular text-sm whitespace-nowrap">
        {module.lessonsDone} / {module.lessonsTotal} lessons
      </span>
    );
  return <span className="font-condensed tabular text-sm whitespace-nowrap text-muted-foreground">Optional · ~{module.duration} h</span>;
}

function DanStatus({ module, trackOpen }: { module: SyllabusModule | undefined; trackOpen: boolean }) {
  if (!module) return <span className="text-sm text-muted-foreground">In preparation</span>;
  if (module.state === "passed")
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
        <SealMark className="size-4" />
        Passed
      </span>
    );
  if (module.state === "locked" || !trackOpen)
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <LockedMark className="size-4" />
        Locked
      </span>
    );
  if (module.checkpointDue) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-primary">
        <SealMark className="size-4" />
        Checkpoint due
      </span>
    );
  }
  return (
    <span className="font-condensed tabular text-sm whitespace-nowrap">
      {module.lessonsDone} / {module.lessonsTotal} lessons
    </span>
  );
}

export default async function ModulesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const [tracks, learner] = await Promise.all([
    getCurriculumState(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { experience: true } }),
  ]);
  const rank = rankFromTracks(tracks, await blackBeltIfDue(userId, tracks));
  const start = tracks.find((t) => t.slug === START_TRACK);
  const python = tracks.find((t) => t.slug === PYTHON_TRACK);
  const automation = tracks.find((t) => t.slug === AUTOMATION_TRACK);
  const modules = python ? toSyllabus(python) : [];
  const danModules = automation ? toSyllabus(automation) : [];
  const passed = modules.filter((m) => m.state === "passed").length;
  const automationOpen = automation?.unlocked ?? false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Syllabus" }]} />
        </FadeIn>

        <FadeIn delay={0.03}>
          <header className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="font-condensed text-5xl leading-none font-extrabold tracking-[-0.02em] sm:text-6xl">
                The syllabus
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                Sixteen Python modules from white belt to black belt, then eight AI automation modules
                for the dan grades. Each module you pass puts a stripe on your belt; modules open in order.
              </p>
            </div>
            <p className="font-condensed tabular leading-none">
              <span className="text-6xl font-extrabold tracking-[-0.03em]">{passed}</span>
              <span className="ml-1 text-2xl font-bold text-muted-foreground">/ 16 passed</span>
            </p>
          </header>
        </FadeIn>

        <FadeIn delay={0.06}>
          <RankCard rank={rank} showLadder={false} />
        </FadeIn>

        {start && start.modules.length > 0 && (
          <FadeIn delay={0.075}>
            <section
              aria-labelledby="start-heading"
              className="grid gap-5 border-y border-border py-7 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10"
            >
              <div className="flex flex-col gap-2">
                <h2 id="start-heading" className="font-condensed text-xl font-bold">
                  Before the white belt
                </h2>
                <p className="text-sm text-muted-foreground">{start.summary}</p>
                {learner?.experience !== "new" && (
                  <p className="text-sm font-medium">Never programmed? Start here; it&apos;s optional.</p>
                )}
              </div>
              <ol className="flex flex-col">
                {start.modules.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/modules/${m.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-1 hover:text-primary"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-semibold">{m.title}</span>
                        <span className="line-clamp-2 text-sm text-muted-foreground">{m.description}</span>
                      </span>
                      <span className="self-center justify-self-end">
                        <StartStatus module={m} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          </FadeIn>
        )}

        <FadeIn delay={0.09}>
          <SyllabusProgress modules={modules} headingLevel={2} />
        </FadeIn>

        <FadeIn delay={0.12}>
          <section
            aria-labelledby="dan-heading"
            className="grid gap-5 border-t border-border py-7 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10"
          >
            <div className="flex flex-col gap-2">
              <h2 id="dan-heading" className="font-condensed text-xl font-bold">
                AI automation
              </h2>
              <p className="text-sm text-muted-foreground">
                {automationOpen
                  ? "One dan grade per module, from 2nd to 9th."
                  : `Opens once you pass Python module ${AUTOMATION_UNLOCK_AFTER}, where you'll have Pydantic, asyncio and HTTP clients in hand.`}
              </p>
            </div>
            <ol className="flex flex-col">
              {DAN_TRACK.map((d) => {
                const m = danModules.find((x) => x.order === d.dan - 1);
                const open = Boolean(m && automationOpen && m.state !== "locked");
                const row = (
                  <>
                    <span className="font-condensed tabular pt-0.5 text-sm text-muted-foreground">
                      {ordinal(d.dan)} dan
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("font-semibold", !open && "text-muted-foreground")}>
                        {m?.title ?? d.title}
                      </span>
                      {m && (
                        <span className="line-clamp-2 text-sm text-muted-foreground">{m.description}</span>
                      )}
                    </span>
                    <span className="self-center justify-self-end">
                      <DanStatus module={m} trackOpen={automationOpen} />
                    </span>
                  </>
                );
                const rowClass =
                  "grid grid-cols-[3.75rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-border/70 py-3.5 last:border-b-0";
                return (
                  <li key={d.dan}>
                    {open && m ? (
                      <Link href={`/modules/${m.id}`} className={cn(rowClass, "-mx-3 rounded-sm px-3 hover:bg-accent/50")}>
                        {row}
                      </Link>
                    ) : (
                      <div className={cn(rowClass, "opacity-80")} aria-disabled="true">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
