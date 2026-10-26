import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/guard";
import { ACTION_LABEL, listActions } from "@/lib/admin/users";
import { prisma } from "@/lib/prisma";
import { EmptySlot } from "@/components/brand/empty-slot";
import { SheetMark } from "@/components/brand/marks";

export const metadata: Metadata = { title: "Activity (admin)" };

function when(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The detail an action carries, in a line: the module, the reason, the role change */
function detailLine(detail: unknown): string {
  if (!detail || typeof detail !== "object") return "";
  const d = detail as Record<string, unknown>;
  const parts = [
    typeof d.module === "string" && d.module,
    typeof d.code === "string" && d.code,
    typeof d.from === "string" &&
      typeof d.to === "string" &&
      `${d.from.toLowerCase().replace("_", " ")} → ${d.to.toLowerCase().replace("_", " ")}`,
    typeof d.reason === "string" && d.reason && `“${d.reason}”`,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** The audit log: every admin action, newest first, optionally for one account */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const targetId = params.user?.slice(0, 64);
  const [{ total, rows, pages }, pending, target] = await Promise.all([
    listActions({ page, targetId }),
    prisma.projectSubmission.count({ where: { status: "pending" } }),
    targetId
      ? prisma.user.findUnique({ where: { id: targetId }, select: { name: true, email: true } })
      : null,
  ]);
  const href = (p: number) =>
    `/admin/activity?${new URLSearchParams({ ...(targetId ? { user: targetId } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="mx-auto max-w-page px-gutter py-8 sm:py-12">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <AdminHeader
            active="activity"
            title="Activity"
            description="Every change an admin made to an account, a learner's progress or a certificate: who, what, to whom and when. Nothing here can be edited."
            pending={pending}
          />
        </FadeIn>

        <FadeIn delay={0.04}>
          <section aria-labelledby="log-heading" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="log-heading" className="text-sm text-muted-foreground">
                {total} {total === 1 ? "action" : "actions"}
                {targetId && ` on ${target ? target.name || target.email : "a deleted account"}`}
              </h2>
              {targetId && (
                <Link href="/admin/activity" className="text-sm font-medium text-primary underline">
                  Show everyone&apos;s
                </Link>
              )}
            </div>
            {rows.length === 0 ? (
              <EmptySlot mark={<SheetMark />}>
                No admin actions yet. Suspensions, role changes, granted passes and revoked
                certificates are recorded here.
              </EmptySlot>
            ) : (
              <ol className="flex flex-col border-t border-border">
                {rows.map((r) => {
                  const detail = detailLine(r.detail);
                  return (
                    <li
                      key={r.id}
                      className="grid gap-x-6 gap-y-1 border-b border-border py-3 text-sm md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)]"
                    >
                      <span className="font-condensed tabular text-muted-foreground">
                        {when(r.createdAt)}
                      </span>
                      <span className="min-w-0">
                        <span className="font-semibold">{ACTION_LABEL[r.action] ?? r.action}</span>
                        {detail && <span className="text-muted-foreground"> · {detail}</span>}
                        <br />
                        {r.targetId && r.action !== "user.delete" ? (
                          <Link
                            href={`/admin/users/${r.targetId}`}
                            className="text-primary underline"
                          >
                            {r.targetLabel || r.targetId}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">{r.targetLabel}</span>
                        )}
                      </span>
                      <span className="min-w-0 truncate text-muted-foreground">
                        by {r.adminEmail}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </FadeIn>

        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-4">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={href(page - 1)}>
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
                <Link href={href(page + 1)}>
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
