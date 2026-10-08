"use client";

import { Sparkles } from "lucide-react";
import { useElapsed } from "@/components/ui/pending-line";
import { lineAt, STILL_AFTER_MS, STILL_LINE } from "@/lib/tutor/wait-lines";

/**
 * The tutor's reply in progress: lines that follow what it's doing with the learner's own code and
 * run, a soft shimmer, and patience on a slow reply. It sits inside the conversation's polite live
 * region, so screen readers hear the first line and, on a slow reply, that it's still working; the
 * lines in between are for the eye.
 */
export function TutorWaiting({ lines }: { lines: string[] }) {
  const elapsed = useElapsed();
  const line = lineAt(lines, elapsed);
  return (
    <li className="mr-4 flex flex-col gap-2 rounded-md bg-sheet px-3 py-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-primary motion-safe:animate-pulse" aria-hidden="true" />
        {/* Keyed so each new line slides in (no fade, so the text is never faint) */}
        <span key={line} aria-hidden="true" className="animate-in slide-in-from-bottom-1 duration-300">
          {line}
        </span>
        <span className="sr-only">{elapsed >= STILL_AFTER_MS ? STILL_LINE : lines[0]}</span>
      </span>
      <span aria-hidden="true" className="relative h-0.5 overflow-hidden rounded-full bg-primary/15">
        <span className="absolute inset-0 bg-linear-to-r from-transparent via-primary/70 to-transparent motion-safe:animate-[shimmer_1.6s_ease-in-out_infinite] motion-reduce:hidden" />
      </span>
    </li>
  );
}
