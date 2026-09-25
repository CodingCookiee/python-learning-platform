import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GitBranch, FileUp } from "lucide-react";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { Button } from "@/components/ui/button";
import { AdminHeader } from "@/components/admin/admin-header";
import { SealMark } from "@/components/brand/marks";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");
  if (!(await isAdmin(userId))) redirect("/dashboard");

  const [pending, queue, learners, recentLearners, modules, lessons, exercises, projects, approved] =
    await Promise.all([
      prisma.projectSubmission.count({ where: { status: "pending" } }),
      prisma.projectSubmission.findMany({
        where: { status: "pending" },
        orderBy: { submittedAt: "asc" },
        take: 5,
        select: {
          id: true,
          files: true,
          submittedAt: true,
          project: { select: { title: true, module: { select: { order: true } } } },
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.user.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, xp: true, level: true, createdAt: true },
      }),
      prisma.module.count(),
      prisma.lesson.count(),
      prisma.exercise.count(),
      prisma.project.count(),
      prisma.projectSubmission.count({ where: { status: "approved" } }),
    ]);

  const content = [
    { label: "Modules", value: modules },
    { label: "Lessons", value: lessons },
    { label: "Exercises", value: exercises, warn: exercises === 0 },
    { label: "Capstone projects", value: projects },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-10">
        <FadeIn>
          <AdminHeader
            active="overview"
            title="Examiner's desk"
            description={`Grade capstone submissions and keep the syllabus in shape. Signed in as ${session.user?.email ?? "admin"}.`}
            pending={pending}
          />
        </FadeIn>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* Review queue: the desk's main job */}
          <FadeIn delay={0.04}>
            <section aria-labelledby="queue-heading" className="flex flex-col gap-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-3">
                  <span className="font-condensed tabular text-7xl leading-[0.8] font-extrabold tracking-[-0.03em]">
                    {pending}
                  </span>
                  <h2 id="queue-heading" className="pb-1 text-xl font-semibold">
                    {pending === 1 ? "submission waiting" : "submissions waiting"} for review
                  </h2>
                </div>
                {pending > 0 && (
                  <Button asChild>
                    <Link href="/admin/projects">
                      Open the queue
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
              </div>

              {queue.length > 0 ? (
                <ol className="flex flex-col border-t border-border">
                  {queue.map((s) => {
                    const viaGithub = s.files.includes('"type":"github"');
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/admin/projects/${s.id}/evaluate`}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-3.5 hover:bg-accent/40"
                        >
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="truncate font-semibold">{s.project.title}</span>
                            <span className="truncate text-sm text-muted-foreground">
                              {s.user.name ?? s.user.email} · module {s.project.module.order}
                            </span>
                          </span>
                          <span className="font-condensed tabular flex items-center gap-3 text-sm whitespace-nowrap text-muted-foreground">
                            {viaGithub ? (
                              <GitBranch className="size-4" aria-label="GitHub link" />
                            ) : (
                              <FileUp className="size-4" aria-label="File upload" />
                            )}
                            {formatDate(s.submittedAt)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
                  <SealMark className="size-5" />
                  The desk is clear. {approved > 0 ? `${approved} capstones approved so far.` : ""}
                </div>
              )}
            </section>
          </FadeIn>

          {/* Facts about the dojo */}
          <FadeIn delay={0.08}>
            <div className="flex flex-col gap-10">
              <section aria-labelledby="content-heading" className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id="content-heading" className="text-xl font-semibold">
                    Syllabus content
                  </h2>
                  <Link href="/admin/content" className="text-sm font-medium text-primary underline">
                    Manage
                  </Link>
                </div>
                <dl className="grid grid-cols-2 border-t border-border">
                  {content.map((c) => (
                    <div key={c.label} className="flex flex-col gap-1 border-b border-border py-3 odd:pr-4">
                      <dt className="text-sm text-muted-foreground">{c.label}</dt>
                      <dd className="font-condensed tabular text-3xl leading-none font-extrabold">
                        {c.value}
                        {c.warn && (
                          <span className="ml-2 rounded-sm bg-highlight px-1.5 align-middle text-xs font-bold text-highlight-foreground">
                            none yet
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section aria-labelledby="learners-heading" className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id="learners-heading" className="text-xl font-semibold">
                    Newest learners
                  </h2>
                  <span className="font-condensed tabular text-sm text-muted-foreground">
                    {learners} total
                  </span>
                </div>
                <ul className="flex flex-col border-t border-border">
                  {recentLearners.map((u) => (
                    <li
                      key={u.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-3"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{u.name ?? "Unnamed learner"}</span>
                        <span className="truncate text-sm text-muted-foreground">{u.email}</span>
                      </span>
                      <span className="font-condensed tabular text-right text-sm whitespace-nowrap text-muted-foreground">
                        Level {u.level} · {u.xp} XP
                        <br />
                        joined {formatDate(u.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </FadeIn>
        </div>
      </StaggerContainer>
    </div>
  );
}
