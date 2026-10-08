"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { patience, stageIndex, type StageTiming } from "@/lib/pending/stages";
import { cn } from "@/lib/utils";

/** Milliseconds since this component mounted, ticking a few times a second */
export function useElapsed(): number {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - start), 400);
    return () => window.clearInterval(timer);
  }, []);
  return elapsed;
}

/**
 * What a wait is doing right now: its phases in turn ("Saving your pass…", "Adding your XP…"), held
 * on the last, with a quieter line underneath once it runs long (`still`, then `slow`). Screen
 * readers hear the first phase and, on a long wait, the `still` line; the steps between are for the
 * eye. Remount it (a `key`) to start a new wait from the top. Pass `live={false}` inside an existing
 * live region.
 */
export function PendingLine({
  lines,
  still,
  slow,
  live = true,
  shimmer = false,
  icon,
  className,
  delayMs = 0,
  ...timing
}: {
  lines: string[];
  still?: string;
  slow?: string;
  live?: boolean;
  /** A thin moving bar under the line, for the longest waits */
  shimmer?: boolean;
  icon?: React.ReactNode;
  className?: string;
  /** Show nothing for this long, so a wait that's over in a moment doesn't flash a line */
  delayMs?: number;
} & StageTiming) {
  const elapsed = useElapsed();
  if (elapsed < delayMs) return null;
  const line = lines[stageIndex(lines.length, elapsed, timing.stepMs)] ?? "";
  const stage = patience(elapsed, timing);
  const sub = stage === "slow" ? (slow ?? still) : stage === "still" ? still : undefined;
  return (
    <div role={live ? "status" : undefined} className={cn("flex min-w-0 flex-col gap-1 text-sm", className)}>
      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {icon ?? <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />}
        {/* Keyed so each new phase slides in (no fade, so the text is never faint) */}
        <span key={line} aria-hidden="true" className="min-w-0 animate-in slide-in-from-bottom-1 duration-300">
          {line}
        </span>
        <span className="sr-only">{stage !== "none" && still ? still : lines[0]}</span>
      </span>
      {sub && (
        <span key={sub} aria-hidden="true" className="animate-in pl-6 text-xs text-muted-foreground slide-in-from-bottom-1 duration-300">
          {sub}
        </span>
      )}
      {shimmer && (
        <span aria-hidden="true" className="relative ml-6 h-0.5 overflow-hidden rounded-full bg-primary/15">
          <span className="absolute inset-0 bg-linear-to-r from-transparent via-primary/70 to-transparent motion-safe:animate-[shimmer_1.6s_ease-in-out_infinite] motion-reduce:hidden" />
        </span>
      )}
    </div>
  );
}
