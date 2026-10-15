import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin/guard";
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
import type { Prisma } from "@/lib/generated/prisma/client";
import { overviewStats } from "@/lib/admin/users";

export const metadata: Metadata = { title: "Admin" };

/** Live content only: archived rows and pre-content legacy modules (no track) are not counted */
const LIVE_MODULE = { archivedAt: null, trackId: { not: null } } satisfies Prisma.ModuleWhereInput;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminDashboardPage() {
  // Every admin sees the overview; a regular admin's is read-only (no links into accounts)
  const me = await requireAdminPage("admin");
  const isSuper = me.level === "super";

  const [
    stats,
    pending,
    queue,
    learners,
    recentLearners,
    modules,
    lessons,
    exercises,
    projects,
    approved,
  ] = await Promise.all([
    overviewStats(),
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
    prisma.module.count({ where: LIVE_MODULE }),
    prisma.lesson.count({ where: { archivedAt: null, module: LIVE_MODULE } }),
    prisma.exercise.count({
      where: { archivedAt: null, lesson: { archivedAt: null, module: LIVE_MODULE } },
    }),
    prisma.project.count({ where: { archivedAt: null, module: LIVE_MODULE } }),
    prisma.projectSubmission.count({ where: { status: "approved" } }),
  ]);

  const site = [
    {
      label: "Accounts",
      value: stats.users,
      note: `${stats.unverified} email not confirmed · ${stats.suspended} suspended`,
    },
    { label: "New this week", value: stats.signups7, note: `${stats.signups30} in 30 days` },
    { label: "Active this week", value: stats.active7, note: "trained in the last 7 days" },
    { label: "Gradings, 30 days", value: stats.gradings30, note: `${stats.passed30} passed` },
    { label: "Capstones waiting", value: stats.pending, note: "for an examiner" },
    { label: "Certificates", value: stats.certificates, note: "issued and live" },
  ];
  const peak = Math.max(1, ...stats.perDay.map((d) => d.count));

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
            description={
              isSuper
                ? `The whole site: accounts, capstones and the syllabus. Signed in as ${me.email}, super admin.`
                : `Capstones waiting for review, and the site at a glance. Signed in as ${me.email}, admin.`
            }
            pending={pending}
          />
        </FadeIn>

        {/* The site at a glance: ruled figures, then sign-ups day by day */}
        <FadeIn delay={0.02}>
          <section aria-labelledby="site-heading" className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="site-heading" className="text-xl font-semibold">
                The site
              </h2>
              {isSuper && (
                <Link href="/admin/users" className="text-sm font-medium text-primary underline">
                  All users
                </Link>
              )}
            </div>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-3">
                {site.map((f) => (
                  <div
                    key={f.label}
                    className="flex flex-col gap-1 border-b border-border py-3 pr-4"
                  >
                    <dt className="text-sm text-muted-foreground">{f.label}</dt>
                    <dd className="flex flex-col gap-0.5">
                      <span className="font-condensed tabular text-3xl leading-none font-extrabold">
                        {f.value.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">{f.note}</span>
                    </dd>
                  </div>
                ))}
              </dl>
              <figure className="flex flex-col gap-2 border-t border-border pt-3">
                <figcaption className="text-sm text-muted-foreground">
                  Sign-ups, last 14 days
                </figcaption>
                <ol
                  className="flex h-28 items-end gap-1"
                  aria-label="Sign-ups per day, oldest first"
                >
                  {stats.perDay.map((d) => (
                    <li
                      key={d.day}
                      className="flex h-full flex-1 flex-col justify-end"
                      title={`${new Date(d.day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}: ${d.count}`}
                    >
                      <span className="sr-only">
                        {new Date(d.day).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                        : {d.count}
                      </span>
                      <span
                        className="block w-full rounded-t-[2px] bg-primary/70"
                        style={{
                          height: `${Math.max(d.count > 0 ? 6 : 2, (d.count / peak) * 100)}%`,
                          opacity: d.count > 0 ? 1 : 0.35,
                        }}
                        aria-hidden="true"
                      />
                    </li>
                  ))}
                </ol>
                <span
                  className="font-condensed tabular flex justify-between text-xs text-muted-foreground"
                  aria-hidden="true"
                >
                  <span>14 days ago</span>
                  <span>today</span>
                </span>
              </figure>
            </div>
          </section>
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
                  <Link
                    href="/admin/content"
                    className="text-sm font-medium text-primary underline"
                  >
                    Manage
                  </Link>
                </div>
                <dl className="grid grid-cols-2 border-t border-border">
                  {content.map((c) => (
                    <div
                      key={c.label}
                      className="flex flex-col gap-1 border-b border-border py-3 odd:pr-4"
                    >
                      <dt className="text-sm text-muted-foreground">{c.label}</dt>
                      <dd className="font-condensed tabular text-3xl leading-none font-extrabold">
                        {c.value}
                        {c.warn && (
                          <span className="ml-2 rounded-sm border border-border px-1.5 align-middle text-xs font-semibold text-muted-foreground">
                            none yet
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {isSuper && (
              <section aria-labelledby="learners-heading" className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id="learners-heading" className="text-xl font-semibold">
                    Newest learners
                  </h2>
                  <Link href="/admin/users" className="text-sm font-medium text-primary underline">
                    All {learners}
                  </Link>
                </div>
                <ul className="flex flex-col border-t border-border">
                  {recentLearners.map((u) => (
                    <li key={u.id}>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-sm border-b border-border px-3 py-3 hover:bg-accent/40"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">
                            {u.name ?? "Unnamed learner"}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">{u.email}</span>
                        </span>
                        <span className="font-condensed tabular text-right text-sm whitespace-nowrap text-muted-foreground">
                          Level {u.level} · {u.xp} XP
                          <br />
                          joined {formatDate(u.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
              )}
            </div>
          </FadeIn>
        </div>
      </StaggerContainer>
    </div>
  );
}
