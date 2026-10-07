"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sensei } from "@/components/quest/sensei";
import { questRefresh, SENSEI } from "@/lib/quest-steps";

/**
 * The dashboard's way into the quest for learners who didn't get it at onboarding: "offer" for
 * those with no quest yet (Start, or No thanks for good), "resume" for a skipped quest with steps
 * done. Either way the panel picks the quest up as soon as the request returns.
 */
export function QuestOffer({ kind, done = 0 }: { kind: "offer" | "resume"; done?: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"go" | "decline" | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [answered, setAnswered] = React.useState(false);

  async function send(action: "start" | "resume" | "skip") {
    setBusy(action === "skip" ? "decline" : "go");
    setFailed(false);
    const res = await fetch(`/api/quest/${action}`, { method: "POST" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      setFailed(true);
      return;
    }
    // The card goes at once; the refresh brings the rest of the dashboard up to date
    setAnswered(true);
    questRefresh();
    router.refresh();
  }

  if (answered) return null;

  const title = kind === "offer" ? SENSEI.offer.title : SENSEI.resume.title;
  const line = kind === "offer" ? SENSEI.offer.line : SENSEI.resume.line(done);
  return (
    <section
      aria-labelledby="quest-offer-heading"
      className="flex flex-col gap-4 rounded-md border border-border bg-sheet p-6 sm:flex-row sm:items-center sm:gap-6"
    >
      <Sensei className="hidden h-18 w-16 sm:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 id="quest-offer-heading" className="font-condensed text-2xl leading-none font-extrabold tracking-[-0.01em]">
          {title}
        </h2>
        <p className="leading-relaxed text-muted-foreground">{line}</p>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            That didn&apos;t go through. Try again in a moment.
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button onClick={() => void send(kind === "offer" ? "start" : "resume")} aria-busy={busy === "go"} disabled={busy !== null}>
          {busy === "go" && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {kind === "offer" ? "Start the quest" : "Resume"}
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Button>
        {kind === "offer" && (
          <Button variant="ghost" onClick={() => void send("skip")} aria-busy={busy === "decline"} disabled={busy !== null}>
            No thanks
          </Button>
        )}
      </div>
    </section>
  );
}
