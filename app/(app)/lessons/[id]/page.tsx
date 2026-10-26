import type { Metadata } from "next";
import { lessonMetadata } from "@/lib/page-titles";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLessonForUser, type LessonDrill } from "@/lib/lessons";
import { getLabForUser } from "@/lib/labs";
import { LabPanel } from "@/components/lesson/lab-panel";
import { getLink, viewOf } from "@/lib/ci/links";
import { onRampHandOver } from "@/lib/onramp";
import { LessonWorkspace } from "@/components/lesson/lesson-workspace";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import {
  LessonSidebar,
  LessonNavigation,
  LessonContent,
  LessonCompleteButton,
} from "@/components/lesson";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { TapeMark } from "@/components/brand/marks";
import { EmptySlot } from "@/components/brand/empty-slot";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return lessonMetadata(id);
}

const DRILL_KIND: Record<string, string> = {
  function: "Code",
  program: "Program",
  predict: "Predict",
  fix: "Fix",
  refactor: "Refactor",
  tests: "Tests",
};

function DrillList({ drills }: { drills: LessonDrill[] }) {
  return (
    <ol className="flex flex-col border-t border-border">
      {drills.map((drill, i) => (
        <li key={drill.id}>
          <Link
            href={`/exercises/${drill.id}`}
            className="-mx-3 grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border-b border-border px-3 py-3.5 hover:bg-accent/50"
          >
            <span className="font-condensed tabular text-sm text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-semibold">{drill.title}</span>
              {drill.description && (
                <span className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">
                  {drill.description}
                </span>
              )}
              <span className="font-condensed tabular flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="rounded-sm border border-border px-1.5 font-sans font-semibold">
                  {DRILL_KIND[drill.type] ?? "Code"}
                </span>
                <span>{drill.difficulty}</span>
                <span className="inline-flex items-center gap-1">
                  <TapeMark className="size-3.5" />
                  {drill.xpReward} XP
                </span>
              </span>
            </span>
            {drill.passed ? (
              <span className="flex items-center gap-1 text-sm font-semibold text-success">
                <Check className="size-4" aria-hidden="true" />
                Passed
              </span>
            ) : drill.attempted ? (
              <span className="text-sm whitespace-nowrap text-muted-foreground">Keep going</span>
            ) : (
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
          </Link>
        </li>
      ))}
    </ol>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  // Signed in as an account that no longer exists: clear the stale session (else a redirect loop)
  if (!user) redirect("/auth/session-ended");

  const lesson = await getLessonForUser(id, user.id);
  if (!lesson) notFound();
  const lab = lesson.moduleUnlocked ? await getLabForUser(user.id, lesson.id) : null;
  const labCi = lab?.spec.kind === "github" ? await getLink(user.id, "lab", lesson.id) : null;
  // On-ramp lessons: the white belt ceremony hands over to Python module 1
  const onRamp = await onRampHandOver(lesson.module.id);

  const required = lesson.drills.filter((d) => d.required);
  const optional = lesson.drills.filter((d) => !d.required);
  const requiredPassed = required.length - lesson.requiredRemaining;
  const blockedMessage = !lesson.moduleUnlocked
    ? "Pass the earlier modules to open this one. You can still read ahead."
    : !lesson.inSequence
      ? "Finish the earlier lessons in this module first."
      : lesson.requiredRemaining > 0
        ? lesson.requiredRemaining === 1 && required.length > 1
          ? "Pass the last required drill and this lesson completes itself."
          : `Pass ${lesson.requiredRemaining === required.length ? "its" : "the remaining"} ${lesson.requiredRemaining} required ${lesson.requiredRemaining === 1 ? "drill" : "drills"} and this lesson completes itself.`
        : undefined;
  // Lessons with required drills complete when the last one passes (the drill page says so); the
  // button stays for lessons without drills, and for ones whose drills were all passed earlier
  const completesByDrills = required.length > 0 && !lesson.completed && !lesson.canComplete;

  return (
    <div className="mx-auto max-w-page px-gutter py-8 sm:py-12">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Syllabus", href: "/modules" },
              { label: lesson.module.title, href: `/modules/${lesson.module.id}` },
              { label: lesson.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.04}>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <LessonSidebar
                currentLessonId={lesson.id}
                moduleId={lesson.module.id}
                moduleTitle={lesson.module.title}
                lessons={lesson.lessons}
                className="sticky top-24"
              />
            </aside>

            <article className="flex min-w-0 flex-col gap-10">
              <LessonWorkspace
                lessonId={lesson.id}
                heading={
                  <>
                    <h1 className="font-condensed text-4xl leading-[0.98] font-extrabold tracking-[-0.02em] sm:text-5xl">
                      {lesson.title}
                    </h1>
                    {lesson.description && (
                      <p className="text-lg leading-relaxed text-muted-foreground">{lesson.description}</p>
                    )}
                  </>
                }
                meta={
                  <p className="font-condensed tabular flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      Lesson {lesson.index + 1} of {lesson.lessons.length}
                    </span>
                    <span>~{lesson.estimatedTime} min</span>
                    {lesson.drills.length > 0 && (
                      <span>
                        {lesson.drills.length} {lesson.drills.length === 1 ? "drill" : "drills"}
                      </span>
                    )}
                    {lesson.completed && (
                      <span className="inline-flex items-center gap-1 font-sans font-semibold text-success">
                        <Check className="size-4" aria-hidden="true" />
                        Finished
                      </span>
                    )}
                  </p>
                }
              >
                {!lesson.moduleUnlocked && (
                  <EmptySlot title="Not open yet" className="mb-10 max-w-[70ch] bg-sheet">
                    Pass the earlier modules to open this one. You can still read ahead.
                  </EmptySlot>
                )}
                <LessonContent content={lesson.content} />
              </LessonWorkspace>

              {lab && (
                <div className="max-w-[70ch]">
                  <LabPanel initial={lab} ci={labCi ? viewOf(labCi, lab.spec.title) : null} />
                </div>
              )}

              {lesson.drills.length > 0 && (
                <section
                  aria-labelledby="drills-heading"
                  className="flex max-w-[70ch] flex-col gap-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 id="drills-heading" className="text-2xl font-semibold">
                      Drills
                    </h2>
                    {required.length > 0 && (
                      <span className="font-condensed tabular text-sm text-muted-foreground">
                        {requiredPassed} of {required.length} required passed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Passing the required drills is what completes the lesson. They run in your
                    browser and check your code with real tests.
                  </p>
                  {required.length > 0 && <DrillList drills={required} />}
                  {optional.length > 0 && (
                    <>
                      <h3 className="mt-2 text-base font-semibold">Extra practice</h3>
                      <DrillList drills={optional} />
                    </>
                  )}
                </section>
              )}

              <div className="flex max-w-[70ch] flex-col gap-8 border-t border-border pt-8">
                {completesByDrills ? (
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">
                      <span className="font-condensed tabular">
                        {requiredPassed} of {required.length}
                      </span>{" "}
                      required {required.length === 1 ? "drill" : "drills"} passed
                    </p>
                    <p className="text-sm text-muted-foreground">{blockedMessage}</p>
                  </div>
                ) : (
                  <LessonCompleteButton
                    lessonId={lesson.id}
                    nextLessonId={lesson.next?.id ?? null}
                    moduleId={lesson.module.id}
                    initialCompleted={lesson.completed}
                    isLocked={!lesson.completed && !lesson.canComplete}
                    lockedMessage={blockedMessage}
                    afterOnRampHref={onRamp?.nextHref}
                    onRampLessons={onRamp?.lessons}
                  />
                )}
                <LessonNavigation previous={lesson.previous} next={lesson.next} />
              </div>
            </article>
          </div>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
