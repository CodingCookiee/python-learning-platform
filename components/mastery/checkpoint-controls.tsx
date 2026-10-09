"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { startNavigation } from "@/components/layout/navigation-progress";
import { ArrowRight, Clock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Start the module's checkpoint (or resume the open one) and go to it. */
export function StartCheckpointButton({
  moduleId,
  label,
  variant = "default",
  size,
}: {
  moduleId: string;
  label: string;
  variant?: "default" | "outline";
  size?: "lg";
}) {
  const router = useRouter();
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
        body: JSON.stringify({ moduleId }),
      });
      const data = (await res.json().catch(() => ({}))) as { attemptId?: string; error?: string };
      if (!res.ok || !data.attemptId) {
        setError(data.error ?? "Couldn’t start the checkpoint.");
        setBusy(false);
        return;
      }
      startNavigation();
      router.push(`/checkpoints/${data.attemptId}`);
    } catch {
      setError("Couldn’t start the checkpoint.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={() => void start()} variant={variant} size={size} aria-busy={busy} className={cn(busy && "cursor-progress")}>
        {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {/* A one-off that moves on to the checkpoint: the label simply says what's happening */}
        {busy ? "Drawing your drills…" : label}
        {!busy && <ArrowRight data-icon="inline-end" aria-hidden="true" />}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
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
      {left === null ? "…" : left === 0 ? "Time’s up: marking your checkpoint…" : `${formatClock(left)} left`}
    </span>
  );
}

/** Close the attempt now; unpassed drills count as failed. */
export function HandInButton({ attemptId, allPassed }: { attemptId: string; allPassed: boolean }) {
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
      startRefresh(() => router.refresh());
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
          <Button onClick={() => void handIn()} aria-busy={working} aria-disabled={working} className={cn(working && "cursor-progress")}>
            {working && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {working ? "Marking your checkpoint…" : "Hand in"}
          </Button>
          {!allPassed && (
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={working}>
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
    <Button variant="outline" onClick={() => setConfirming(true)}>
      Hand in
    </Button>
  );
}
