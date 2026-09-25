import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getAppOrigin } from "@/lib/server-url";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import {
  LessonSidebar,
  LessonNavigation,
  LessonContent,
  LessonCompleteButton,
} from "@/components/lesson";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LockedMark, TapeMark } from "@/components/brand/marks";

// Types

interface LessonExercise {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  order: number;
  xpReward: number;
  hasSubmission: boolean;
  latestSubmission: unknown;
}

interface LessonNavItem {
  id: string;
  title: string;
  order: number;
}

interface LessonData {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  estimatedTime: number;
  module: {
    id: string;
    title: string;
    order: number;
  };
  completed: boolean;
  completedAt: string | null;
  exercises: LessonExercise[];
  navigation: {
    previous: LessonNavItem | null;
    next: LessonNavItem | null;
  };
}

interface ModuleLessonItem {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  estimatedTime: number;
  isUnlocked?: boolean;
}

interface ModuleData {
  id: string;
  title: string;
  lessons: ModuleLessonItem[];
  isUnlocked: boolean;
  prerequisites: Array<{ id: string; title: string; order: number }>;
}

async function getLesson(id: string, cookieHeader: string): Promise<LessonData | null> {
  const res = await fetch(`${await getAppOrigin()}/api/lessons/${id}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return (await res.json()) as LessonData;
}

async function getModuleLessons(
  moduleId: string,
  cookieHeader: string
): Promise<ModuleData | null> {
  const res = await fetch(`${await getAppOrigin()}/api/modules/${moduleId}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as ModuleData;
}

// Helpers

function getDifficultyClass(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "bg-success/12 text-success";
    case "medium":
      return "bg-highlight text-highlight-foreground";
    case "hard":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// Page

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const lesson = await getLesson(id, cookieHeader);
  if (!lesson) notFound();

  const moduleData = await getModuleLessons(lesson.module.id, cookieHeader);
  const currentLessonUnlocked =
    moduleData?.lessons.find((item) => item.id === lesson.id)?.isUnlocked ?? false;
  const lessonLocked = !(moduleData?.isUnlocked && currentLessonUnlocked);
  const lockedPrerequisites = moduleData?.prerequisites ?? [];

  const sidebarLessons: ModuleLessonItem[] = moduleData?.lessons ?? [];

  const lessonIndex = Math.max(1, sidebarLessons.findIndex((l) => l.id === lesson.id) + 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
                lessons={sidebarLessons}
                className="sticky top-24"
              />
            </aside>

            <article className="flex min-w-0 flex-col gap-10">
              <header className="flex max-w-[70ch] flex-col gap-4 border-b border-border pb-8">
                <h1 className="font-condensed text-4xl leading-[0.98] font-extrabold tracking-[-0.02em] sm:text-5xl">
                  {lesson.title}
                </h1>
                {lesson.description && (
                  <p className="text-lg leading-relaxed text-muted-foreground">{lesson.description}</p>
                )}
                <p className="font-condensed tabular flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    Lesson {lessonIndex} of {sidebarLessons.length || "?"}
                  </span>
                  <span>~{lesson.estimatedTime} min</span>
                  {lesson.exercises.length > 0 && (
                    <span>
                      {lesson.exercises.length} {lesson.exercises.length === 1 ? "drill" : "drills"}
                    </span>
                  )}
                  {lesson.completed && (
                    <span className="inline-flex items-center gap-1 font-sans font-semibold text-success">
                      <Check className="size-4" aria-hidden="true" />
                      Finished
                    </span>
                  )}
                </p>
              </header>

              {lessonLocked && (
                <div className="flex max-w-[70ch] items-start gap-3 rounded-md border border-dashed border-border bg-sheet p-5">
                  <LockedMark className="mt-0.5 size-5 text-muted-foreground" />
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">Not open yet</p>
                    <p className="text-sm text-muted-foreground">
                      {lockedPrerequisites.length > 0
                        ? `Pass ${lockedPrerequisites.map((p) => p.title).join(", ")} first. You can still read ahead.`
                        : "Finish the earlier lessons in this module first. You can still read ahead."}
                    </p>
                  </div>
                </div>
              )}

              <LessonContent content={lesson.content} />

              {lesson.exercises.length > 0 && (
                <section aria-labelledby="drills-heading" className="flex max-w-[70ch] flex-col gap-4">
                  <h2 id="drills-heading" className="text-2xl font-semibold">
                    Drills
                  </h2>
                  <ul className="flex flex-col border-t border-border">
                    {lesson.exercises.map((exercise) => (
                      <li key={exercise.id}>
                        <Link
                          href={`/exercises/${exercise.id}`}
                          className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-sm border-b border-border px-3 py-4 hover:bg-accent/50"
                        >
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="font-semibold">{exercise.title}</span>
                            {exercise.description && (
                              <span className="line-clamp-1 text-sm text-muted-foreground">
                                {exercise.description}
                              </span>
                            )}
                            <span className="font-condensed tabular flex items-center gap-3 text-xs text-muted-foreground">
                              <span className={cn("rounded-sm px-1.5 font-sans font-semibold", getDifficultyClass(exercise.difficulty))}>
                                {exercise.difficulty}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <TapeMark className="size-3.5" />
                                {exercise.xpReward} XP
                              </span>
                            </span>
                          </span>
                          {exercise.hasSubmission ? (
                            <Check className="size-5 text-success" aria-label="Attempted" />
                          ) : (
                            <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex max-w-[70ch] flex-col gap-8 border-t border-border pt-8">
                <LessonCompleteButton
                  lessonId={lesson.id}
                  nextLessonId={lesson.navigation.next?.id ?? null}
                  initialCompleted={lesson.completed}
                  isLocked={lessonLocked}
                  lockedMessage={
                    lockedPrerequisites.length > 0
                      ? `Pass ${lockedPrerequisites.map((prereq) => prereq.title).join(", ")} before this lesson can be marked complete.`
                      : "Finish the earlier lessons in this module before this one can be marked complete."
                  }
                />
                <LessonNavigation previous={lesson.navigation.previous} next={lesson.navigation.next} />
              </div>
            </article>
          </div>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
