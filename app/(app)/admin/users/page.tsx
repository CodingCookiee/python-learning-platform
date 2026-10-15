import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/lib/admin/guard";
import { listUsers, USER_FILTERS, type UserFilter } from "@/lib/admin/users";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/admin/status-chip";
import { ROLE_LABEL } from "@/lib/admin/levels";

export const metadata: Metadata = { title: "Users (admin)" };

const FILTER_LABEL: Record<UserFilter, string> = {
  all: "Everyone",
  admins: "Admins",
  unverified: "Email not confirmed",
  suspended: "Suspended",
  inactive: "Not seen in 30+ days",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function since(d: Date | null): string {
  if (!d) return "never";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 200);
  const filter = (USER_FILTERS as readonly string[]).includes(params.filter ?? "")
    ? (params.filter as UserFilter)
    : "all";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [{ total, rows, pages, counts }, pending] = await Promise.all([
    listUsers({ q, filter, page }),
    prisma.projectSubmission.count({ where: { status: "pending" } }),
  ]);
  const href = (next: Partial<{ q: string; filter: UserFilter; page: number }>) => {
    const sp = new URLSearchParams();
    const v = { q, filter, page: 1, ...next };
    if (v.q) sp.set("q", v.q);
    if (v.filter !== "all") sp.set("filter", v.filter);
    if (v.page > 1) sp.set("page", String(v.page));
    const s = sp.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <AdminHeader
            active="users"
            title="Users"
            description="Every account: find anyone by name or email, then open their record to see everything they've done and act on it."
            pending={pending}
          />
        </FadeIn>

        <FadeIn delay={0.04} className="flex flex-col gap-4">
          <form action="/admin/users" method="get" role="search" className="flex max-w-xl gap-2">
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <label htmlFor="user-search" className="sr-only">
              Search users by name or email
            </label>
            <Input
              id="user-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Name or email"
              autoComplete="off"
            />
            <Button type="submit" variant="outline">
              <Search aria-hidden="true" />
              Search
            </Button>
          </form>
          <nav aria-label="Filter users" className="flex flex-wrap gap-2">
            {USER_FILTERS.map((f) => (
              <Link
                key={f}
                href={href({ filter: f })}
                aria-current={f === filter ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm",
                  f === filter
                    ? "border-primary bg-accent/60 font-semibold"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {FILTER_LABEL[f]}
                <span className="font-condensed tabular text-xs font-bold">{counts[f]}</span>
              </Link>
            ))}
          </nav>
        </FadeIn>

        <FadeIn delay={0.06}>
          <section aria-labelledby="users-heading" className="flex flex-col gap-3">
            <h2 id="users-heading" className="text-sm text-muted-foreground">
              {total === 0
                ? "No accounts match."
                : `${total} ${total === 1 ? "account" : "accounts"}${q ? ` matching “${q}”` : ""}, newest first`}
            </h2>
            {rows.length > 0 && (
              <ol className="flex flex-col border-t border-border">
                {rows.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 rounded-sm border-b border-border px-3 py-3.5 hover:bg-accent/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate font-semibold">
                            {u.name || "Unnamed learner"}
                          </span>
                          {(u.role === "ADMIN" || u.role === "SUPER_ADMIN") && (
                            <StatusChip tone="admin">{ROLE_LABEL[u.role]}</StatusChip>
                          )}
                          {u.suspended && <StatusChip tone="warn">Suspended</StatusChip>}
                          {!u.verified && <StatusChip tone="muted">Email not confirmed</StatusChip>}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">{u.email}</span>
                      </span>
                      <span className="hidden text-sm text-muted-foreground md:block">
                        Joined {formatDate(u.createdAt)}
                        <br />
                        Seen {since(u.lastSeen)}
                        {u.lastTrained ? ` · trained ${since(u.lastTrained)}` : " · hasn't trained yet"}
                      </span>
                      <span className="font-condensed tabular hidden text-sm text-muted-foreground md:block">
                        {u.modulesPassed} {u.modulesPassed === 1 ? "grading" : "gradings"} passed
                        <br />
                        Level {u.level} · {u.xp.toLocaleString()} XP
                      </span>
                      <span className="flex items-center gap-3">
                        {u.capstonesPending > 0 && (
                          <StatusChip tone="muted">{u.capstonesPending} to review</StatusChip>
                        )}
                        <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </FadeIn>

        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-4">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={href({ page: page - 1 })}>
                  <ArrowLeft aria-hidden="true" />
                  Newer
                </Link>
              </Button>
            ) : (
              <span />
            )}
            <span className="font-condensed tabular text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            {page < pages ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={href({ page: page + 1 })}>
                  Older
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </nav>
        )}
      </StaggerContainer>
    </div>
  );
}
