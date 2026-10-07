import type { Metadata } from "next";
import { moduleMetadata } from "@/lib/page-titles";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Button } from "@/components/ui/button";
import { formatProjectEstimatedTime } from "@/lib/project-time";
import { getLessonAccessState, getSequentialModuleUnlockMap } from "@/lib/module-access";
import { ArrowLeft, ArrowRight, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BeltBand } from "@/components/brand/belt";
import { LockedMark } from "@/components/brand/marks";
import { beltForModule, ordinal } from "@/lib/ranks";
import { getCheckpointSummary, type CheckpointSummary } from "@/lib/checkpoint";
import { StartCheckpointButton } from "@/components/mastery/checkpoint-controls";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return moduleMetadata(id);
}

function CheckpointSection({ moduleId, summary }: { moduleId: string; summary: CheckpointSummary }) {
  const terms = `${summary.pick} drills from this module, ${summary.minutes} minutes, pass ${Math.round(summary.passMark * 100)}%`;
  const best = summary.bestScore !== null ? `Best so far: ${Math.round(summary.bestScore * 100)}%.` : null;
  let body: React.ReactNode;
  switch (summary.status) {
    case "passed":
      body = (
        <p className="text-muted-foreground">
          {summary.passedPlacement ? "Passed as a placement test. " : "Passed. "}
          {best}
        </p>
      );
      break;
    case "locked":
      body = <p className="text-muted-foreground">Opens with the module. {terms}.</p>;
      break;
    case "open":
      body = (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">You have a checkpoint in progress. The clock is running.</p>
          <Button asChild>
            <Link href={`/checkpoints/${summary.openAttemptId}`}>
              Resume the checkpoint
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      );
      break;
    case "cooldown":
      body = (
        <p className="text-muted-foreground">
          {best} A fresh set of drills is ready at{" "}
          {new Date(summary.retryAt!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Meanwhile, redo
          the drills you missed.
        </p>
      );
      break;
    case "ready":
      body = (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">
            Every lesson is done. The checkpoint is what passes the module: {terms}. Each drill starts blank, with no
            hints and no reference solution. {best}
          </p>
          <StartCheckpointButton moduleId={moduleId} label="Take the checkpoint" />
        </div>
      );
      break;
    case "placement":
      body = (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">
            It opens once the lessons are done: {terms}. Already know this material? Take it now as a placement test;
            passing it passes the module without the lessons. {best}
          </p>
          <StartCheckpointButton moduleId={moduleId} label="Test out" variant="outline" />
        </div>
      );
      break;
    default:
      return null;
  }
  return (
    <section aria-labelledby="checkpoint-heading" className="flex max-w-3xl flex-col gap-3">
      <h2 id="checkpoint-heading" className="text-xl font-semibold">
        Checkpoint
      </h2>
      {body}
    </section>
  );
}

function getProjectSubmissionState(
  status?: string | null
): "none" | "pending" | "rejected" | "approved" {
  switch (status?.toLowerCase()) {
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    default:
      return "none";
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { id } = await params;

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user?.email ?? "" },
    select: { id: true },
  });
  if (!dbUser) redirect("/auth/signin");

  const userId = dbUser.id;

  const learningModule = await prisma.module.findFirst({
    where: { id, archivedAt: null, trackId: { not: null } },
    include: {
      track: { select: { slug: true, grade: true } },
      lessons: {
        where: { archivedAt: null },
        orderBy: { order: "asc" },
        include: {
          exercises: { where: { archivedAt: null, required: true }, select: { id: true } },
          progress: {
            where: { userId },
            select: { completed: true, completedAt: true },
          },
        },
      },
      projects: {
        where: { archivedAt: null },
        include: {
          submissions: {
            where: { userId },
            orderBy: { submittedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!learningModule) notFound();

  // Calculate completion
  const totalLessons = learningModule.lessons.length;
  const completedCount = learningModule.lessons.filter((l) => l.progress[0]?.completed).length;

  const [moduleUnlockMap, checkpoint] = await Promise.all([
    getSequentialModuleUnlockMap(userId),
    getCheckpointSummary(userId, learningModule.id),
  ]);
  const isUnlocked = moduleUnlockMap.get(learningModule.id) ?? false;

  const lessons = learningModule.lessons.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    order: l.order,
    estimatedTime: l.estimatedTime,
    exerciseCount: l.exercises.length,
    completed: l.progress[0]?.completed ?? false,
    completedAt: l.progress[0]?.completedAt?.toISOString() ?? null,
  }));
  const lessonAccess = getLessonAccessState(
    lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      completed: lesson.completed,
    })),
    isUnlocked
  );
  const lessonAccessMap = new Map(lessonAccess.map((lesson) => [lesson.id, lesson.isUnlocked]));

  const projects = learningModule.projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.summary || p.description,
    estimatedTime: formatProjectEstimatedTime(p.estimatedTime),
    xpReward: p.xpReward,
    latestSubmission: p.submissions[0] ?? null,
  }));

  const firstIncompleteLesson = lessons.find((l) => !l.completed);
  const firstLesson = lessons[0] ?? null;
  const displayDuration = learningModule.duration;
  const isDan = learningModule.track?.grade === "dan";
  // The Start on-ramp: no grade, no stripe, never a gate
  const isStart = learningModule.track?.grade === "none";
  const moduleLabel = isDan
    ? `${ordinal(learningModule.order + 1)} dan`
    : isStart
      ? "Start here"
      : `Module ${learningModule.order}`;
  const belt = beltForModule(learningModule.order);
  const stripeNumber = learningModule.order - belt.fromModule + 1;
  const stripeSlots = belt.toModule - belt.fromModule + 1;
  const lessonsComplete = totalLessons > 0 && completedCount === totalLessons;
  // The checkpoint passes the module; a module without one passes on its lessons
  const isPassed = checkpoint?.status === "passed" || (checkpoint?.status === "none" && lessonsComplete);
  const checkpointReady = checkpoint?.status === "ready";

  const [prevModule, nextModule] = await Promise.all([
    prisma.module.findFirst({
      where: { trackId: learningModule.trackId, archivedAt: null, order: { lt: learningModule.order } },
      orderBy: { order: "desc" },
      select: { id: true, title: true, order: true },
    }),
    prisma.module.findFirst({
      where: { trackId: learningModule.trackId, archivedAt: null, order: { gt: learningModule.order } },
      orderBy: { order: "asc" },
      select: { id: true, title: true, order: true },
    }),
  ]);

  const action = !isUnlocked
    ? null
    : isPassed
      ? { label: "Review lessons", href: firstLesson ? `/lessons/${firstLesson.id}` : null, variant: "outline" as const }
      : completedCount === 0
        ? { label: "Start module", href: firstLesson ? `/lessons/${firstLesson.id}` : null, variant: "default" as const }
        : {
            label: "Continue",
            href: firstIncompleteLesson ? `/lessons/${firstIncompleteLesson.id}` : null,
            variant: "default" as const,
          };

  const projectStatus: Record<ReturnType<typeof getProjectSubmissionState>, { label: string; className: string }> = {
    approved: { label: "Approved", className: "bg-success/12 text-success" },
    pending: { label: "Under review", className: "bg-accent text-foreground" },
    rejected: { label: "Needs revision", className: "bg-destructive/10 text-destructive" },
    none: { label: "Not started", className: "bg-muted text-muted-foreground" },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Syllabus", href: "/modules" },
              { label: learningModule.title },
            ]}
          />
        </FadeIn>

        {/* Module sheet header */}
        <FadeIn delay={0.03}>
          <header className="grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-14">
            <div className="flex flex-col gap-4">
              <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em] sm:text-6xl">
                {learningModule.title}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {learningModule.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {isDan ? (
                  <span>AI automation · {moduleLabel}</span>
                ) : isStart ? (
                  <span>Before the white belt · optional, no grade</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <BeltBand
                      belt={belt.key}
                      slots={stripeSlots}
                      filled={isPassed ? stripeNumber : stripeNumber - 1}
                      className="h-4 w-20"
                    />
                    <span>
                      {moduleLabel} · stripe {stripeNumber} of {stripeSlots} on the {belt.label.toLowerCase()}
                    </span>
                  </span>
                )}
                <span className="font-condensed tabular text-muted-foreground">
                  {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"} · ~{displayDuration} h
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 lg:min-w-64 lg:items-end">
              {isUnlocked ? (
                <>
                  <p className="font-condensed tabular leading-none lg:text-right">
                    <span className="text-6xl font-extrabold tracking-[-0.03em]">{completedCount}</span>
                    <span className="text-2xl font-bold text-muted-foreground"> / {totalLessons}</span>
                    <span className="mt-1 block text-sm font-semibold text-muted-foreground">
                      {isPassed
                        ? checkpoint?.passedPlacement
                          ? "passed · tested out"
                          : "passed"
                        : lessonsComplete
                          ? "lessons done · checkpoint due"
                          : "lessons done"}
                    </span>
                  </p>
                  {checkpointReady ? (
                    <StartCheckpointButton moduleId={learningModule.id} label="Take the checkpoint" size="lg" />
                  ) : checkpoint?.status === "open" ? (
                    <Button asChild size="lg">
                      <Link href={`/checkpoints/${checkpoint.openAttemptId}`}>
                        Resume the checkpoint
                        <ArrowRight data-icon="inline-end" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : action?.href && (
                    <Button asChild size="lg" variant={action.variant}>
                      <Link href={action.href}>
                        {action.label}
                        <ArrowRight data-icon="inline-end" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex max-w-xs flex-col gap-2 rounded-md border border-dashed border-border p-5">
                  <span className="flex items-center gap-2 font-semibold">
                    <LockedMark className="size-5 text-muted-foreground" />
                    Not open yet
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {isDan && !prevModule
                      ? "The AI automation track opens once you pass Python module 14."
                      : `Modules open in order. Pass ${prevModule ? prevModule.title : "the previous module"} to open this one.`}
                  </p>
                </div>
              )}
            </div>
          </header>
        </FadeIn>

        {learningModule.outcomes.length > 0 && (
          <FadeIn delay={0.05}>
            <section aria-labelledby="outcomes-heading" className="flex max-w-3xl flex-col gap-3">
              <h2 id="outcomes-heading" className="text-xl font-semibold">
                By the end you can
              </h2>
              <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {learningModule.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2.5 text-[0.9875rem] leading-snug">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </section>
          </FadeIn>
        )}

        {/* Lessons */}
        <FadeIn delay={0.06}>
          <section aria-labelledby="lessons-heading" className="flex flex-col gap-4">
            <h2 id="lessons-heading" className="text-xl font-semibold">
              Lessons
            </h2>
            <ol className="flex flex-col border-t border-border">
              {lessons.map((lesson) => {
                const lessonUnlocked = lessonAccessMap.get(lesson.id) ?? false;
                const isNext = isUnlocked && lesson.id === firstIncompleteLesson?.id;
                const row = (
                  <>
                    <span className="font-condensed tabular pt-0.5 text-lg font-bold text-muted-foreground">
                      {String(lesson.order).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("font-semibold", !lessonUnlocked && "text-muted-foreground")}>
                        {lesson.title}
                        {isNext && (
                          <span className="ml-2 rounded-sm bg-highlight px-1.5 align-middle text-xs whitespace-nowrap font-semibold text-highlight-foreground">
                            Up next
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">
                        {lesson.description}
                      </span>
                    </span>
                    <span className="font-condensed tabular flex items-center gap-4 self-center text-sm whitespace-nowrap text-muted-foreground">
                      <span>{lesson.estimatedTime} min</span>
                      {lesson.exerciseCount > 0 && (
                        <span>
                          {lesson.exerciseCount} {lesson.exerciseCount === 1 ? "drill" : "drills"}
                        </span>
                      )}
                      <span className="flex w-5 justify-end">
                        {lesson.completed ? (
                          <Check className="size-4 text-success" aria-label="Finished" />
                        ) : !lessonUnlocked ? (
                          <LockedMark className="size-4" title="Locked" />
                        ) : (
                          <Circle className="size-3.5" aria-label="Not started" />
                        )}
                      </span>
                    </span>
                  </>
                );
                const rowClass =
                  "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3 border-b border-border py-4";
                return (
                  <li key={lesson.id}>
                    {lessonUnlocked ? (
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className={cn(rowClass, "-mx-3 rounded-sm px-3 hover:bg-accent/50", isNext && "bg-accent/40")}
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className={cn(rowClass, "opacity-75")} aria-disabled="true">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        </FadeIn>

        {checkpoint && checkpoint.status !== "none" && (
          <FadeIn delay={0.08}>
            <CheckpointSection moduleId={learningModule.id} summary={checkpoint} />
          </FadeIn>
        )}

        {/* Capstone */}
        {projects.length > 0 && (
          <FadeIn delay={0.09}>
            <section aria-labelledby="projects-heading" className="flex flex-col gap-4">
              <h2 id="projects-heading" className="text-xl font-semibold">
                Capstone project
              </h2>
              <ul className="flex flex-col border-t border-border">
                {projects.map((project) => {
                  const status = projectStatus[getProjectSubmissionState(project.latestSubmission?.status)];
                  return (
                    <li
                      key={project.id}
                      className="grid gap-4 border-b border-border py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{project.title}</span>
                          <span className={cn("rounded-sm px-1.5 text-xs font-semibold", status.className)}>
                            {status.label}
                          </span>
                        </span>
                        <span className="line-clamp-2 max-w-3xl text-sm text-muted-foreground">
                          {project.description}
                        </span>
                        <span className="font-condensed tabular text-xs text-muted-foreground">
                          ~{project.estimatedTime} h · {project.xpReward} XP on approval
                        </span>
                      </div>
                      {isUnlocked && (
                        <Button variant="outline" asChild>
                          <Link href={`/projects/${project.id}`}>
                            Open project
                            <ArrowRight data-icon="inline-end" aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </FadeIn>
        )}

        {/* Neighbouring modules */}
        <FadeIn delay={0.12}>
          <nav aria-label="Other modules" className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
            {prevModule ? (
              <Link
                href={`/modules/${prevModule.id}`}
                className="group flex items-center gap-3 rounded-md border border-border p-4 hover:bg-accent/50"
              >
                <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm text-muted-foreground">{isDan ? `${ordinal(prevModule.order + 1)} dan` : `Module ${prevModule.order}`}</span>
                  <span className="truncate font-semibold">{prevModule.title}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {nextModule && (
              <Link
                href={`/modules/${nextModule.id}`}
                className="group flex items-center justify-end gap-3 rounded-md border border-border p-4 text-right hover:bg-accent/50"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm text-muted-foreground">{isDan ? `${ordinal(nextModule.order + 1)} dan` : `Module ${nextModule.order}`}</span>
                  <span className="truncate font-semibold">{nextModule.title}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            )}
          </nav>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
