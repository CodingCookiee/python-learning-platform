"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AdminNotice } from "@/lib/admin/notifications";
import { RankMark, SheetMark } from "@/components/brand/marks";
import { Spinner } from "@/components/brand/knot-loader";

/** How often the closed bell asks for its count, while the tab is in view */
const POLL_MS = 60_000;

export function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function NoticeIcon({ kind }: { kind: AdminNotice["kind"] }) {
  const Icon = kind === "signup" ? RankMark : SheetMark;
  return <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

/**
 * The admin's bell: new sign-ups and capstones handed in. The count comes with the page and is
 * refreshed every minute while the tab is visible; opening the bell loads the latest notices.
 */
export function AdminBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = React.useState(initialUnread);
  const [items, setItems] = React.useState<AdminNotice[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);

  React.useEffect(() => {
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/admin/notifications?count=1").catch(() => null);
      if (!stopped && res?.ok) setUnread(((await res.json()) as { unread: number }).unread);
    }
    const timer = window.setInterval(() => void poll(), POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);

  async function load() {
    setFailed(false);
    const res = await fetch("/api/admin/notifications").catch(() => null);
    if (!res?.ok) return setFailed(true);
    const data = (await res.json()) as { unread: number; items: AdminNotice[] };
    setItems(data.items);
    setUnread(data.unread);
  }

  async function markRead(ids?: string[]) {
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => null);
    if (!res?.ok) return;
    setUnread(((await res.json()) as { unread: number }).unread);
    setItems(
      (list) => list?.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)) ?? null
    );
  }

  const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <DropdownMenu onOpenChange={(open) => open && void load()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          title={label}
          className="relative"
        >
          <Bell aria-hidden="true" />
          {unread > 0 && (
            <span
              className="font-condensed tabular absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-sm bg-highlight px-1 text-[0.6875rem] leading-none font-bold text-highlight-foreground"
              aria-hidden="true"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (markingAll) return;
                setMarkingAll(true);
                await markRead();
                setMarkingAll(false);
              }}
              aria-busy={markingAll || undefined}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium text-primary underline",
                markingAll && "cursor-progress"
              )}
            >
              {markingAll && <Spinner className="size-3" />}
              {markingAll ? "Marking read…" : "Mark all read"}
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[26rem] overflow-y-auto">
          {failed ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Couldn&apos;t load notifications. Try again.
            </p>
          ) : items === null ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing yet. New sign-ups and capstones land here.
            </p>
          ) : (
            items.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onSelect={() => {
                  if (!n.read) void markRead([n.id]);
                  startNavigation();
                  router.push(n.href);
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-none px-3 py-2.5",
                  !n.read && "bg-accent/40"
                )}
              >
                <NoticeIcon kind={n.kind} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("truncate text-sm", !n.read && "font-semibold")}>
                    {n.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{n.body}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && (
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem
          asChild
          className="justify-center rounded-none py-2.5 text-sm font-medium"
        >
          <Link href="/admin/notifications">See all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
