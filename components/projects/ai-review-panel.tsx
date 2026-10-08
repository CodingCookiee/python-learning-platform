"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CircleDashed, Sparkles, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { PendingLine } from "@/components/ui/pending-line";
import { cn } from "@/lib/utils";
import type { AiReview } from "@/lib/ai/reviewer";

type StoredReview = AiReview & { model?: string; files?: number };

const MET = {
  yes: { Icon: Check, label: "Met", className: "text-success" },
  partly: { Icon: CircleDashed, label: "Partly", className: "text-(--code-string)" },
  no: { Icon: X, label: "Not yet", className: "text-destructive" },
} as const;

export function AiReviewBody({ review, reviewedAt }: { review: StoredReview; reviewedAt: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cn("font-semibold", review.verdict === "ready" ? "text-success" : "text-foreground")}>
          {review.verdict === "ready" ? "Looks ready for the examiner" : "Needs more work"}
        </span>
        <span className="text-xs text-muted-foreground">
          {[review.model, review.files ? `${review.files} files read` : null, reviewedAt ? new Date(reviewedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <p className="leading-relaxed">{review.summary}</p>
      <ul className="flex flex-col border-t border-border">
        {review.criteria.map((c, i) => {
          const m = MET[c.met];
          return (
            <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 border-b border-border py-3">
              <m.Icon className={cn("mt-0.5 size-4", m.className)} aria-label={m.label} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{c.criterion}</span>
                <span className="text-sm text-muted-foreground">{c.evidence}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {review.security.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold text-destructive">Security</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {review.security.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      {review.nextSteps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold">Next steps</h3>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {review.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/** On the capstone page: ask for a review of the latest submission, on the learner's own key */
export function AiReviewPanel({
  projectId,
  aiReady,
  initialReview,
  initialReviewedAt,
}: {
  projectId: string;
  aiReady: boolean;
  initialReview: StoredReview | null;
  initialReviewedAt: string | null;
}) {
  const [review, setReview] = React.useState(initialReview);
  const [reviewedAt, setReviewedAt] = React.useState(initialReviewedAt);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/review`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { aiReview?: StoredReview; aiReviewedAt?: string; error?: string };
      if (!res.ok || !data.aiReview) setError(data.error ?? "The review failed.");
      else {
        setReview(data.aiReview);
        setReviewedAt(data.aiReviewedAt ?? null);
      }
    } catch {
      setError("We couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="ai-review-heading" className="flex flex-col gap-4 rounded-md border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ai-review-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          AI review
        </h2>
        {aiReady && (
          <LoadingButton
            variant={review ? "outline" : "default"}
            size="sm"
            onClick={() => void run()}
            loading={busy}
            loadingText="Reviewing…"
          >
            {review ? "Review again" : "Review my submission"}
          </LoadingButton>
        )}
      </div>
      {!aiReady && (
        <p className="text-sm text-muted-foreground">
          Get a criterion-by-criterion review of your submission before the examiner sees it. It runs on your own API
          key:{" "}
          <Link href="/settings" className="font-medium text-primary underline">
            add one in Settings
          </Link>
          .
        </p>
      )}
      {busy && (
        <PendingLine
          shimmer
          icon={<Sparkles className="size-4 shrink-0 text-primary motion-safe:animate-pulse" aria-hidden="true" />}
          lines={["Reading your submission…", "Checking it against “How it's graded”…", "Writing your review…"]}
          stepMs={7000}
          stillAfterMs={25_000}
          slowAfterMs={70_000}
          still="Still reviewing: a careful review takes up to a minute."
          slow="Some models take up to two minutes. It's still working."
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {review ? (
        // The old review stays readable but steps back while a new one is written
        <div className={cn("transition-opacity", busy && "opacity-50")}>
          <AiReviewBody review={review} reviewedAt={reviewedAt} />
        </div>
      ) : (
        aiReady && (
          <p className="text-sm text-muted-foreground">
            It reads your files (or your public GitHub repo) against “How it&apos;s graded” and says what&apos;s met, what
            isn&apos;t, and what to fix. The examiner sees it too, and still makes the call.
          </p>
        )
      )}
    </section>
  );
}
