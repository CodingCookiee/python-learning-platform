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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Zap, BookOpen, Lock, ChevronRight } from "lucide-react";

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

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "text-emerald-600 dark:text-emerald-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    case "hard":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Modules", href: "/modules" },
              { label: lesson.module.title, href: `/modules/${lesson.module.id}` },
              { label: lesson.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar */}
            <aside className="hidden lg:block lg:col-span-1">
              <LessonSidebar
                currentLessonId={lesson.id}
                moduleId={lesson.module.id}
                moduleTitle={lesson.module.title}
                lessons={sidebarLessons}
                className="sticky top-24"
              />
            </aside>

            {/* Main content */}
            <div className="lg:col-span-3 flex flex-col gap-8">
              {/* Lesson header */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {lesson.completed && (
                    <Badge className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Completed
                    </Badge>
                  )}
                  <Badge className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    {lesson.estimatedTime} min
                  </Badge>
                  {lesson.exercises.length > 0 && (
                    <Badge className="flex items-center gap-1.5 text-muted-foreground">
                      <BookOpen className="size-3" aria-hidden="true" />
                      {lesson.exercises.length} exercise{lesson.exercises.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>
                {lesson.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {lesson.description}
                  </p>
                )}
              </div>

              {lessonLocked && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="flex flex-col gap-4 pt-6">
                    <div className="flex items-center gap-2">
                      <Lock
                        className="size-4 text-amber-600 dark:text-amber-400"
                        aria-hidden="true"
                      />
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        This lesson is locked
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lockedPrerequisites.length > 0
                        ? `Complete the prerequisite module${lockedPrerequisites.length > 1 ? "s" : ""} first.`
                        : "Complete the previous lessons in this module first."}
                    </p>
                    {lockedPrerequisites.length > 0 ? (
                      <ul className="flex flex-col gap-2">
                        {lockedPrerequisites.map((prereq) => (
                          <li key={prereq.id}>
                            <Button variant="outline" size="sm" asChild className="justify-start">
                              <Link href={`/modules/${prereq.id}`}>
                                <BookOpen className="size-3.5" aria-hidden="true" />
                                {prereq.title}
                                <ChevronRight className="size-3" aria-hidden="true" />
                              </Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        The next lesson unlocks after you complete the earlier lessons.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Lesson content (markdown) */}
              <LessonContent content={lesson.content} />

              {/* Exercises */}
              {lesson.exercises.length > 0 && (
                <section aria-labelledby="exercises-heading">
                  <h2
                    id="exercises-heading"
                    className="mb-4 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground"
                  >
                    Exercises ({lesson.exercises.length})
                  </h2>
                  <div className="flex flex-col gap-3">
                    {lesson.exercises.map((exercise) => (
                      <Link key={exercise.id} href={`/exercises/${exercise.id}`}>
                        <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
                          <CardContent className="flex items-start justify-between gap-4 pt-5 pb-5">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <p className="text-sm font-semibold">{exercise.title}</p>
                              {exercise.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {exercise.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 mt-1">
                                <span
                                  className={`font-heading text-[10px] font-semibold tracking-widest uppercase ${getDifficultyColor(exercise.difficulty)}`}
                                >
                                  {exercise.difficulty}
                                </span>
                                <span className="flex items-center gap-1 font-heading text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                                  <Zap className="size-3" aria-hidden="true" />
                                  {exercise.xpReward} XP
                                </span>
                              </div>
                            </div>
                            {exercise.hasSubmission && (
                              <CheckCircle2
                                className="size-4 shrink-0 text-emerald-500 mt-0.5"
                                aria-label="Submitted"
                              />
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              {/* Mark as Complete */}
              <LessonCompleteButton
                lessonId={lesson.id}
                nextLessonId={lesson.navigation.next?.id ?? null}
                initialCompleted={lesson.completed}
                isLocked={lessonLocked}
                lockedMessage={
                  lockedPrerequisites.length > 0
                    ? `Complete ${lockedPrerequisites.map((prereq) => prereq.title).join(", ")} before this lesson can be marked complete.`
                    : "Complete the previous lessons in this module before this lesson can be marked complete."
                }
              />

              {/* Navigation */}
              <LessonNavigation
                previous={lesson.navigation.previous}
                next={lesson.navigation.next}
              />
            </div>
          </div>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
