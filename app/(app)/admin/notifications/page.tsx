import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn, StaggerContainer } from "@/components/animations";
import { AdminHeader } from "@/components/admin/admin-header";
import { MarkAllRead } from "@/components/admin/mark-all-read";
import { requireAdminPage } from "@/lib/admin/guard";
import { listNotifications, unreadCount } from "@/lib/admin/notifications";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { FileUp, UserPlus } from "lucide-react";

export const metadata: Metadata = { title: "Notifications (admin)" };

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Every notice this admin has had: new sign-ups and capstones, newest first */
export default async function AdminNotificationsPage() {
  const me = await requireAdminPage("admin");
  const [items, unread, pending] = await Promise.all([
    listNotifications(me.id, { take: 100 }),
    unreadCount(me.id),
    prisma.projectSubmission.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <StaggerContainer className="flex flex-col gap-8">
        <FadeIn>
          <AdminHeader
            active="notifications"
            title="Notifications"
            description="A notice for every new sign-up and every capstone handed in. The bell in the header shows how many you haven't read."
            pending={pending}
            actions={unread > 0 ? <MarkAllRead /> : undefined}
          />
        </FadeIn>

        <FadeIn delay={0.04}>
          <section aria-labelledby="notices-heading" className="flex flex-col gap-3">
            <h2 id="notices-heading" className="text-sm text-muted-foreground">
              {unread > 0 ? `${unread} unread · ` : ""}latest {items.length}
            </h2>
            {items.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                Nothing yet. When someone signs up or hands in a capstone, it shows up here and on
                the bell.
              </p>
            ) : (
              <ol className="flex flex-col border-t border-border">
                {items.map((n) => {
                  const Icon = n.kind === "signup" ? UserPlus : FileUp;
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        className={cn(
                          "-mx-3 grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-3 rounded-sm border-b border-border px-3 py-3 hover:bg-accent/40",
                          !n.read && "bg-accent/30"
                        )}
                      >
                        <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className={cn("truncate", !n.read && "font-semibold")}>
                            {n.title}
                            {!n.read && <span className="sr-only"> (unread)</span>}
                          </span>
                          <span className="truncate text-sm text-muted-foreground">{n.body}</span>
                        </span>
                        <span className="font-condensed tabular text-sm whitespace-nowrap text-muted-foreground">
                          {when(n.createdAt)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}
