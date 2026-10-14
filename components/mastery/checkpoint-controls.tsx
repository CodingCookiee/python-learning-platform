"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { ArrowRight, Clock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHECKPOINT_RETRY_MINUTES, runsLate } from "@/lib/mastery-rules";
import { cn } from "@/lib/utils";

/**
 * Start the module's grading (or resume the open one) and go to it. A timed sitting with a cooldown
 * after a miss isn't started by a curious click: the first press says what it is (drills, minutes,
 * pass mark, the rules, that the clock doesn't pause) and the clock starts on the second.
 */
export function StartCheckpointButton({
  moduleId,
  label,
  terms,
  variant = "default",
  size,
  scope = "module",
}: {
  moduleId: string;
  label: string;
  terms: { drills: number; minutes: number; passMark: number };
  variant?: "default" | "outline";
  size?: "lg";
  /** "belt": the belt test-out offered from this module's page */
  scope?: "module" | "belt";
}) {
  const router = useRouter();
  // When the confirmation opened: the grading's finish time is worked out from it
  const [confirming, setConfirming] = React.useState<Date | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, scope }),
      });
      const data = (await res.json().catch(() => ({}))) as { attemptId?: string; error?: string };
      if (!res.ok || !data.attemptId) {
        setError(data.error ?? "Couldn’t start the grading.");
        setBusy(false);
        return;
      }
      startNavigation();
      router.push(`/checkpoints/${data.attemptId}`);
    } catch {
      setError("Couldn’t start the grading.");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button onClick={() => setConfirming(new Date())} variant={variant} size={size}>
        {label}
        <ArrowRight data-icon="inline-end" aria-hidden="true" />
      </Button>
    );
  }
  const ends = new Date(confirming.getTime() + terms.minutes * 60_000);
  const endsAt = ends.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const late = runsLate(confirming, terms.minutes);
  return (
    <div role="group" aria-labelledby={`start-${scope}-${moduleId}`} className="flex max-w-xl flex-col items-start gap-3 rounded-md border border-border bg-sheet p-4">
      <p id={`start-${scope}-${moduleId}`} className="font-semibold">
        <span className="font-condensed tabular">
          {terms.drills} drills · {terms.minutes} minutes · {Math.round(terms.passMark * 100)}% to pass
        </span>
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        No hints, no reference solution, and no copy and paste. The clock starts when you press Start and doesn&apos;t
        pause: started now, it ends at <span className="font-semibold text-foreground">{endsAt}</span>. If you don&apos;t
        pass, a fresh set is ready {CHECKPOINT_RETRY_MINUTES} minutes later.
      </p>
      {late && (
        <p className="border-l-2 border-highlight pl-3 text-sm leading-relaxed">
          That runs late into the night. A grading goes best fresh: nothing expires if you take it tomorrow instead.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {/* Focus lands here, so the keyboard is where the decision is */}
        <Button autoFocus onClick={() => void start()} aria-busy={busy} className={cn(busy && "cursor-progress")}>
          {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Clock aria-hidden="true" />}
          {/* A one-off that moves on to the grading: the label simply says what's happening */}
          {busy ? "Drawing your drills…" : "Start the clock"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
          Not now
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/**
 * What a checkpoint clock says to screen readers: once on crossing 15, 5 and 1 minute left, and at
 * time up (the visible clock only turns red under 5 minutes). Derived from the time left, so the
 * live region changes, and speaks, only when a threshold passes.
 */
export function ClockAnnouncement({ left }: { left: number | null }) {
  const text =
    left === null
      ? ""
      : left === 0
        ? "Time's up. The grading is being marked."
        : left <= 60_000
          ? "1 minute left in the grading."
          : left <= 5 * 60_000
            ? "5 minutes left in the grading."
            : left <= 15 * 60_000
              ? "15 minutes left in the grading."
              : "";
  return (
    <span role="status" className="sr-only">
      {text}
    </span>
  );
}

/** How often a clock at zero asks the server again to close the attempt */
const REFRESH_AT_ZERO_MS = 5000;

/** Time left on an attempt; refreshes the page when it runs out so the server closes it. */
export function CheckpointClock({ deadline, className }: { deadline: string; className?: string }) {
  const router = useRouter();
  const [left, setLeft] = React.useState<number | null>(null);
  // A refresh still on its way (the one that closes the attempt marks it, which takes a moment):
  // the next waits for it rather than piling up behind it
  const [refreshing, startRefresh] = React.useTransition();
  const refreshingRef = React.useRef(false);
  React.useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);
  React.useEffect(() => {
    const end = new Date(deadline).getTime();
    let lastRefresh = 0;
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      // Again every few seconds until the closed checkpoint replaces this page: this computer's
      // clock can run ahead of the server's, which only closes it once its own time is up
      if (ms === 0 && !refreshingRef.current && Date.now() - lastRefresh >= REFRESH_AT_ZERO_MS) {
        lastRefresh = Date.now();
        startRefresh(() => router.refresh());
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, router]);
  return (
    <span
      className={cn(
        "font-condensed tabular inline-flex items-center gap-1.5",
        left !== null && left < 5 * 60_000 && "font-bold text-destructive",
        className
      )}
    >
      {left === 0 ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Clock className="size-4" aria-hidden="true" />
      )}
      {left === null ? "…" : left === 0 ? "Time’s up: marking your grading…" : `${formatClock(left)} left`}
      <ClockAnnouncement left={left} />
    </span>
  );
}

/**
 * Close the attempt now; unpassed drills count as failed. On the checkpoint page the marked result
 * comes in by refresh; from inside one of its drills, `href` is where to go to see it.
 */
export function HandInButton({
  attemptId,
  allPassed,
  href,
  size = "default",
}: {
  attemptId: string;
  allPassed: boolean;
  href?: string;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // The refresh that brings in the marked checkpoint: busy until it has
  const [refreshing, startRefresh] = React.useTransition();

  async function handIn() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/checkpoints/${attemptId}/hand-in`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "That didn't hand in. Try again in a moment.");
        setBusy(false);
        return;
      }
      startRefresh(() => (href ? router.push(href) : router.refresh()));
    } catch {
      setError("We couldn't reach the server. Try again in a moment.");
      setBusy(false);
    }
  }
  const working = busy || refreshing;

  if (allPassed || confirming) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {!allPassed && <span className="text-sm">Hand in now? Drills you haven’t passed count as failed.</span>}
          <Button
            size={size}
            onClick={() => void handIn()}
            aria-busy={working}
            aria-disabled={working}
            className={cn(working && "cursor-progress")}
          >
            {working && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {working ? "Marking your grading…" : "Hand in"}
          </Button>
          {!allPassed && (
            <Button size={size} variant="ghost" onClick={() => setConfirming(false)} disabled={working}>
              Keep going
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <Button size={size} variant="outline" onClick={() => setConfirming(true)}>
      Hand in
    </Button>
  );
}
