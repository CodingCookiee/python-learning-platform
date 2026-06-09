import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AnimatedProgressBar } from "@/components/progress";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Lock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export interface ModuleDetailLesson {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedTime: number;
  exerciseCount: number;
  completed: boolean;
  completedAt: string | null;
}

export interface ModuleDetailProject {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  xpReward: number;
  hasSubmission: boolean;
  latestSubmission: unknown;
}

export interface ModuleDetailPrerequisite {
  id: string;
  title: string;
  order: number;
}

export interface ModuleDetailData {
  id: string;
  title: string;
  description: string;
  phase: string;
  order: number;
  duration: number;
  completionPercentage: number;
  isUnlocked: boolean;
  prerequisites: ModuleDetailPrerequisite[];
  dependents: ModuleDetailPrerequisite[];
  lessons: ModuleDetailLesson[];
  projects: ModuleDetailProject[];
}

async function getModule(id: string, cookieHeader: string): Promise<ModuleDetailData | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/modules/${id}`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) return null;

  return (await res.json()) as ModuleDetailData;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { id } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const moduleData = await getModule(id, cookieHeader);
  if (!moduleData) notFound();

  const firstIncompleteLesson = moduleData.lessons.find((l) => !l.completed);
  const firstLesson = moduleData.lessons[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Modules", href: "/modules" },
              { label: moduleData.title },
            ]}
          />
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="text-muted-foreground">Phase {moduleData.phase}</Badge>
                  {!moduleData.isUnlocked && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Lock className="size-2.5" aria-hidden="true" />
                      Locked
                    </Badge>
                  )}
                </div>
                <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                  {moduleData.title}
                </h1>
                <p className="text-sm text-muted-foreground">
                  <Clock className="mr-1 inline size-3" aria-hidden="true" />
                  {moduleData.duration}h estimated
                </p>
              </div>
              <span className="font-heading text-2xl font-semibold text-muted-foreground">
                {moduleData.completionPercentage}% complete
              </span>
            </div>
            <AnimatedProgressBar value={moduleData.completionPercentage} className="mt-4" />
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-8 lg:col-span-2">
              <section aria-labelledby="lessons-heading">
                <h2
                  id="lessons-heading"
                  className="mb-4 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground"
                >
                  Lessons ({moduleData.lessons.length})
                </h2>
                <div className="flex flex-col divide-y divide-border ring-1 ring-foreground/5">
                  {moduleData.lessons.map((lesson) => {
                    const inner = (
                      <div className="flex items-center gap-3 bg-card px-4 py-3">
                        {lesson.completed ? (
                          <CheckCircle2
                            className="size-4 shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={
                            "flex-1 truncate text-sm font-medium" +
                            (!moduleData.isUnlocked ? " text-muted-foreground" : "")
                          }
                        >
                          {lesson.title}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                          <span>{lesson.estimatedTime}min</span>
                          <span>{lesson.exerciseCount} exercises</span>
                        </span>
                      </div>
                    );

                    if (!moduleData.isUnlocked) {
                      return (
                        <div key={lesson.id} aria-disabled="true">
                          {inner}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={lesson.id}
                        href={`/lessons/${lesson.id}`}
                        className="transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${lesson.title}${lesson.completed ? " (completed)" : ""}`}
                      >
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              </section>

              {moduleData.projects.length > 0 && (
                <section aria-labelledby="projects-heading">
                  <h2
                    id="projects-heading"
                    className="mb-4 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground"
                  >
                    Projects ({moduleData.projects.length})
                  </h2>
                  <div className="flex flex-col gap-3">
                    {moduleData.projects.map((project) => (
                      <Card key={project.id}>
                        <CardContent className="flex flex-col gap-3 pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <p className="font-heading text-sm font-semibold">{project.title}</p>
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {project.description}
                              </p>
                            </div>
                            <span
                              className={
                                "shrink-0 text-xs font-semibold tracking-widest uppercase" +
                                (project.hasSubmission
                                  ? " text-emerald-500"
                                  : " text-muted-foreground")
                              }
                            >
                              {project.hasSubmission ? "Submitted" : "Not started"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="size-2.5" aria-hidden="true" />
                              {project.estimatedTime}h
                            </Badge>
                            <Badge variant="secondary">{project.xpReward} XP</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
              <Card>
                <CardContent className="flex flex-col gap-4 pt-6">
                  {!moduleData.isUnlocked ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
                        <p className="text-sm font-semibold">Prerequisites not met</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Complete the required modules before starting this one.
                      </p>
                      <Button disabled className="w-full">
                        Locked
                      </Button>
                    </>
                  ) : moduleData.completionPercentage === 100 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          Module Complete
                        </p>
                      </div>
                      <Button
                        className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                        disabled
                      >
                        Module Complete
                      </Button>
                      {firstLesson !== null && (
                        <Button variant="outline" className="w-full" asChild>
                          <Link href={`/lessons/${firstLesson.id}`}>
                            Review lessons
                            <ExternalLink
                              data-icon="inline-end"
                              className="size-3"
                              aria-hidden="true"
                            />
                          </Link>
                        </Button>
                      )}
                    </>
                  ) : moduleData.completionPercentage === 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Ready to start? Dive into the first lesson.
                      </p>
                      {firstLesson !== null && (
                        <Button className="w-full" asChild>
                          <Link href={`/lessons/${firstLesson.id}`}>
                            Start Module
                            <ArrowRight data-icon="inline-end" aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Keep going, you are {moduleData.completionPercentage}% through this module.
                      </p>
                      {firstIncompleteLesson !== undefined && (
                        <Button className="w-full" asChild>
                          <Link href={`/lessons/${firstIncompleteLesson.id}`}>
                            Continue Module
                            <ArrowRight data-icon="inline-end" aria-hidden="true" />
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {moduleData.description}
                  </p>
                  <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                    <div className="flex flex-col gap-0.5 text-center">
                      <span className="font-heading text-lg font-semibold">
                        {moduleData.lessons.length}
                      </span>
                      <span className="text-xs text-muted-foreground">lessons</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <span className="font-heading text-lg font-semibold">
                        {moduleData.projects.length}
                      </span>
                      <span className="text-xs text-muted-foreground">projects</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-center">
                      <span className="font-heading text-lg font-semibold">
                        {moduleData.duration}h
                      </span>
                      <span className="text-xs text-muted-foreground">total</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {moduleData.prerequisites.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prerequisites</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col divide-y divide-border">
                      {moduleData.prerequisites.map((prereq) => (
                        <li key={prereq.id}>
                          <Link
                            href={`/modules/${prereq.id}`}
                            className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="flex-1">{prereq.title}</span>
                            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {moduleData.dependents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Unlocks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-col divide-y divide-border">
                      {moduleData.dependents.map((dep) => (
                        <li key={dep.id}>
                          <Link
                            href={`/modules/${dep.id}`}
                            className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="flex-1">{dep.title}</span>
                            <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
