"use client";

import { BeltLoader } from "@/components/brand/belt-loader";
import * as React from "react";
import Link from "next/link";
import { AiReviewBody } from "@/components/projects/ai-review-panel";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { PendingLine } from "@/components/ui/pending-line";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/brand/knot-loader";
import { Check, ChevronDown, ExternalLink, FileText, ListChecks, PenLine } from "lucide-react";
import { Seal } from "@/components/brand/seal";
import { SealMark, SenseiMark } from "@/components/brand/marks";
import { draftFeedback, isReadableSource, matchCriteria } from "@/lib/ai/reviewer";
import { cn } from "@/lib/utils";
import type { SubmissionDetail } from "../page";

interface EvaluateClientProps {
  submission: SubmissionDetail;
  /** The examiner has an AI key in Settings, so "Review with AI" can run */
  aiReady: boolean;
}

type ExaminerReview = NonNullable<SubmissionDetail["examinerAiReview"]>;

/**
 * The examiner's AI assistant: a review of this submission on the examiner's own key, checking the
 * code against each criterion. It can tick the checklist and draft the feedback; it never grades.
 */
function ExaminerAiReview({
  submissionId,
  aiReady,
  initialReview,
  initialReviewedAt,
  onTick,
  onDraft,
}: {
  submissionId: string;
  aiReady: boolean;
  initialReview: ExaminerReview | null;
  initialReviewedAt: string | null;
  /** Tick the checklist from the review; says what it did */
  onTick: (review: ExaminerReview) => string;
  /** Draft the feedback from the review; says what it did */
  onDraft: (review: ExaminerReview) => string;
}) {
  const [review, setReview] = React.useState(initialReview);
  const [reviewedAt, setReviewedAt] = React.useState(initialReviewedAt);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [applied, setApplied] = React.useState("");

  async function run() {
    setBusy(true);
    setError(null);
    setApplied("");
    try {
      const res = await fetch(`/api/admin/projects/submissions/${submissionId}/ai-review`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { review?: ExaminerReview; reviewedAt?: string; error?: string };
      if (!res.ok || !data.review) setError(data.error ?? "The review failed.");
      else {
        setReview(data.review);
        setReviewedAt(data.reviewedAt ?? null);
      }
    } catch {
      setError("We couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="examiner-ai-heading" className="flex flex-col gap-4 border-b border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="examiner-ai-heading" className="font-semibold">
          Grade with AI <span className="font-normal text-muted-foreground">(on your key; you decide)</span>
        </h2>
        {aiReady && (
          <LoadingButton
            // Outline: the page's one primary is the decision (Approve and stamp), not the AI's opinion
            variant="outline"
            size="sm"
            onClick={() => void run()}
            loading={busy}
            loadingText="Reviewing…"
            icon={<SenseiMark />}
          >
            {review ? "Review again" : "Review with AI"}
          </LoadingButton>
        )}
      </div>
      {!aiReady ? (
        <p className="text-sm text-muted-foreground">
          Add your own AI key in{" "}
          <Link href="/settings" className="font-medium text-primary underline">
            Settings
          </Link>{" "}
          to have the AI check the code against each criterion, tick the checklist and draft your feedback. You still approve
          it or send it back.
        </p>
      ) : (
        !review &&
        !busy && (
          <p className="text-sm text-muted-foreground">
            The AI reads the code against each criterion and cites its evidence. It can tick the checklist and draft your
            feedback; you check both and decide.
          </p>
        )
      )}
      {busy && (
        <PendingLine
          shimmer
          icon={<BeltLoader size="sm" />}
          lines={["Reading the submission…", "Checking it against each criterion…", "Writing the review…"]}
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
      {review && (
        // The last review stays readable but steps back while a new one is written
        <div className={cn("flex flex-col gap-4 transition-opacity", busy && "opacity-50")}>
          <AiReviewBody review={review} reviewedAt={reviewedAt} forExaminer />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setApplied(onTick(review))}>
              <ListChecks aria-hidden="true" />
              Tick the checklist from it
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setApplied(onDraft(review))}>
              <PenLine aria-hidden="true" />
              Draft feedback from it
            </Button>
          </div>
        </div>
      )}
      <p role="status" className={cn("text-sm text-muted-foreground", !applied && "sr-only")}>
        {applied}
      </p>
    </section>
  );
}

type Decision = "approved" | "rejected";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasDownloadableContent(file: { content?: string }): boolean {
  return typeof file.content === "string" && file.content.length > 0;
}

/** Larger files are downloaded rather than shown on the page */
const VIEW_MAX_BYTES = 200_000;

/**
 * A submitted file's text, for reading on the page: source and text files only (the AI reviewer's own
 * rule), valid UTF-8, under the size cap. Null otherwise; the file can still be downloaded.
 */
function fileText(file: { name: string; size: number; content?: string }): string | null {
  if (!file.content || file.size > VIEW_MAX_BYTES || !isReadableSource(file.name)) return null;
  try {
    const bytes = Uint8Array.from(atob(file.content), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** One submitted file: its name and size, View (text files, shown inline) and Download */
/** Files up to this many lines open by default on the examiner's screen */
const SHORT_FILE_LINES = 60;

function SubmittedFile({
  file,
  href,
}: {
  file: { name: string; size: number; type: string; content?: string };
  href: string;
}) {
  const text = fileText(file);
  // A short file is shown straight away; a long one waits behind View so the page stays scannable
  const [open, setOpen] = React.useState(() => text !== null && text.split("\n").length <= SHORT_FILE_LINES);
  const panelId = React.useId();
  return (
    <li className="border-b border-border py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-mono text-sm">{file.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-condensed tabular text-sm text-muted-foreground">{formatFileSize(file.size)}</span>
          {text !== null && (
            <Button size="xs" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={panelId}>
              <ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
              {open ? "Hide" : "View"}
            </Button>
          )}
          {hasDownloadableContent(file) ? (
            <Button size="xs" variant="outline" asChild>
              <a href={href} download={file.name} target="_blank" rel="noopener noreferrer">
                Download
              </a>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground" title="The file content wasn't stored with this submission">
              Not stored
            </span>
          )}
        </span>
      </div>
      {open && text !== null && (
        // Focusable so a long file scrolls from the keyboard; read-only, as submitted
        <pre
          id={panelId}
          tabIndex={0}
          aria-label={`${file.name}, as submitted`}
          className="scroll-cue mt-2.5 max-h-[32rem] overflow-auto rounded-sm border border-border bg-background px-4 py-3 font-mono text-[0.8125rem] leading-6 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
        >
          {text || <span className="text-muted-foreground">(empty file)</span>}
        </pre>
      )}
    </li>
  );
}

export function EvaluateClient({ submission, aiReady }: EvaluateClientProps) {
  const router = useRouter();

  const [checklist, setChecklist] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(submission.project.successCriteria.map((_, i) => [`criterion_${i}`, false]))
  );
  const [feedback, setFeedback] = React.useState("");
  const [pendingDecision, setPendingDecision] = React.useState<Decision | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stamped, setStamped] = React.useState(false);

  const feedbackTrimmed = feedback.trim();
  const feedbackValid = feedbackTrimmed.length >= 20;
  const checklistValues = Object.values(checklist);
  const allPassed = checklistValues.every(Boolean);
  const passCount = checklistValues.filter(Boolean).length;

  function toggleCriterion(key: string) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // From the examiner's AI review: met criteria ticked, the rest unticked, any it didn't judge left alone
  function tickFromReview(review: ExaminerReview): string {
    const verdicts = matchCriteria(submission.project.successCriteria, review);
    setChecklist((prev) => ({
      ...prev,
      ...Object.fromEntries(verdicts.flatMap((v, i) => (v === null ? [] : [[`criterion_${i}`, v === "yes"]]))),
    }));
    const met = verdicts.filter((v) => v === "yes").length;
    const unjudged = verdicts.filter((v) => v === null).length;
    return `Ticked the ${met} of ${verdicts.length} criteria the AI found met${
      unjudged > 0 ? `; it didn't judge ${unjudged}, so those are as you left them` : ""
    }. Check each one before you decide.`;
  }

  function draftFromReview(review: ExaminerReview): string {
    const draft = draftFeedback(review);
    setFeedback((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${draft}` : draft));
    return "Drafted the feedback below from the review. Edit it before you send it.";
  }

  function handleDecisionClick(decision: Decision) {
    setError(null);
    setPendingDecision(decision);
  }

  async function handleConfirm() {
    if (!pendingDecision || !feedbackValid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/submissions/${submission.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: pendingDecision, feedback: feedbackTrimmed, checklist }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to evaluate submission");
      }
      if (pendingDecision === "approved") {
        // Stamp the seal on the sheet, then return to the queue
        setPendingDecision(null);
        setStamped(true);
        await new Promise((r) => setTimeout(r, 1100));
      }
      router.push("/admin/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
      setPendingDecision(null);
    }
  }

  const { filesPayload } = submission;
  const learner = submission.submitter.name ?? submission.submitter.email;

  return (
    <div className="flex flex-col gap-8">
      {/* One grading sheet: who, what, the checklist, the verdict */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative rounded-md border border-border bg-sheet"
      >
        {stamped && (
          // Pressed into the blank space beside the submission link, clear of any text
          <div className="pointer-events-none absolute top-6 right-4 z-10 sm:top-36 sm:right-10">
            <Seal label="Passed" detail="Capstone graded" animate className="scale-110" />
          </div>
        )}

        <section aria-labelledby="who-heading" className="grid gap-4 border-b border-border p-6 sm:grid-cols-3">
          <h2 id="who-heading" className="sr-only">
            Submission
          </h2>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">Learner</span>
            <span className="font-semibold">{learner}</span>
            {submission.submitter.name && (
              <span className="text-sm text-muted-foreground">{submission.submitter.email}</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">Module</span>
            <span className="font-semibold">{submission.project.module.title}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">Submitted</span>
            <span className="font-condensed tabular font-semibold">{formatDate(submission.submittedAt)}</span>
          </div>
        </section>

        <section aria-labelledby="work-heading" className="flex flex-col gap-4 border-b border-border p-6">
          <h2 id="work-heading" className="text-lg font-semibold">
            What they submitted
          </h2>
          {filesPayload.type === "github" ? (
            <a
              href={filesPayload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 font-medium text-primary underline underline-offset-4"
            >
              {filesPayload.url}
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : filesPayload.files && filesPayload.files.length > 0 ? (
            <ul className="flex flex-col border-t border-border">
              {filesPayload.files.map((file, i) => (
                <SubmittedFile key={i} file={file} href={`/api/admin/projects/submissions/${submission.id}/file/${i}`} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No files listed.</p>
          )}
          {filesPayload.notes && (
            <div className="flex flex-col gap-1 rounded-sm bg-accent/50 px-4 py-3">
              <span className="text-sm font-semibold">Their notes</span>
              <p className="text-sm leading-relaxed whitespace-pre-line">{filesPayload.notes}</p>
            </div>
          )}
        </section>

        {submission.ci && (
          <section aria-labelledby="ci-heading" className="flex flex-col gap-1.5 border-b border-border p-6 text-sm">
            <h2 id="ci-heading" className="font-semibold">
              Acceptance tests
            </h2>
            <p>
              {submission.ci.verifiedAt && submission.ci.status !== "passed" && (
                <span className="font-semibold text-success">
                  Passed on{" "}
                  {new Date(submission.ci.verifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                  (confirmed with GitHub) · latest run:{" "}
                </span>
              )}
              <span
                className={
                  submission.ci.status === "passed"
                    ? "font-semibold text-success"
                    : submission.ci.status === "failed" || submission.ci.status === "invalid"
                      ? "font-semibold text-destructive"
                      : "font-semibold"
                }
              >
                {submission.ci.status === "passed"
                  ? "Passed (confirmed with GitHub)"
                  : submission.ci.status === "failed"
                    ? "Failing"
                    : submission.ci.status === "invalid"
                      ? "Last run didn't count"
                      : "No confirmed run yet"}
              </span>
              {submission.ci.total > 0 && (
                <span className="font-condensed tabular text-muted-foreground">
                  {" "}
                  · {submission.ci.passed} of {submission.ci.total} tests
                </span>
              )}
              <span className="text-muted-foreground"> · {submission.ci.repo}</span>
            </p>
            {submission.ci.runUrl && (
              <a href={submission.ci.runUrl} target="_blank" rel="noopener noreferrer" className="w-fit text-primary underline">
                Open the run on GitHub
              </a>
            )}
          </section>
        )}

        {submission.aiReview && (
          <section aria-labelledby="ai-heading" className="flex flex-col gap-3 border-b border-border p-6">
            <h2 id="ai-heading" className="font-semibold">
              AI review <span className="font-normal text-muted-foreground">(run by the learner; advice, not a grade)</span>
            </h2>
            <AiReviewBody review={submission.aiReview} reviewedAt={submission.aiReviewedAt} />
          </section>
        )}

        <ExaminerAiReview
          submissionId={submission.id}
          aiReady={aiReady}
          initialReview={submission.examinerAiReview}
          initialReviewedAt={submission.examinerAiReviewedAt}
          onTick={tickFromReview}
          onDraft={draftFromReview}
        />

        <section aria-labelledby="criteria-heading" className="flex flex-col gap-4 border-b border-border p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="criteria-heading" className="text-lg font-semibold">
              Grading checklist
            </h2>
            <span className="font-condensed tabular text-sm text-muted-foreground">
              {passCount} of {checklistValues.length} met
            </span>
          </div>
          {submission.project.successCriteria.length > 0 ? (
            <ul className="flex flex-col border-t border-border">
              {submission.project.successCriteria.map((criterion, i) => {
                const key = `criterion_${i}`;
                const checked = checklist[key] ?? false;
                return (
                  <li key={key} className="border-b border-border">
                    <button
                      type="button"
                      onClick={() => toggleCriterion(key)}
                      className="flex w-full items-start gap-3 py-3 text-left hover:bg-accent/40"
                      aria-pressed={checked}
                    >
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          checked ? "border-success bg-success text-primary-foreground" : "border-(--keyline)/60"
                        }`}
                        aria-hidden="true"
                      >
                        {checked && <Check className="size-3.5" />}
                      </span>
                      <span className={checked ? "leading-relaxed" : "leading-relaxed text-foreground/80"}>
                        {criterion}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">This project has no criteria defined.</p>
          )}
        </section>

        <section aria-labelledby="feedback-heading" className="flex flex-col gap-3 p-6">
          <h2 id="feedback-heading" className="text-lg font-semibold">
            Feedback for {learner}
          </h2>
          <Textarea
            placeholder="What works, what to change, and what to try next. At least 20 characters."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={8}
            aria-label="Feedback for the learner"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className={feedbackTrimmed.length > 0 && !feedbackValid ? "text-destructive" : "text-muted-foreground"}>
              <span className="font-condensed tabular">{feedbackTrimmed.length}</span>
              {feedbackValid ? " characters" : " / 20 characters minimum"}
            </p>
            {!allPassed && checklistValues.length > 0 && (
              <p className="text-muted-foreground">
                {passCount === 0
                  ? "No criteria marked as met yet."
                  : `${checklistValues.length - passCount} criteria not yet met.`}
              </p>
            )}
          </div>
        </section>
      </motion.div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="destructive"
          size="lg"
          onClick={() => handleDecisionClick("rejected")}
          disabled={!feedbackValid || isSubmitting || stamped}
        >
          Send back for revision
        </Button>
        <Button
          size="lg"
          onClick={() => handleDecisionClick("approved")}
          disabled={!feedbackValid || isSubmitting || stamped}
        >
          <SealMark aria-hidden="true" />
          Approve and stamp
        </Button>
      </div>

      <Dialog
        open={pendingDecision !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setPendingDecision(null);
        }}
      >
        <DialogContent showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>
              {pendingDecision === "approved" ? "Approve this capstone?" : "Send it back for revision?"}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === "approved" ? (
                <>
                  {learner} gets the project’s XP and the seal on their record.
                  {allPassed
                    ? " Every criterion is marked as met."
                    : ` Only ${passCount} of ${checklistValues.length} criteria are marked as met.`}{" "}
                  This can&apos;t be undone.
                </>
              ) : (
                <>{learner} sees your feedback and can submit again.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDecision(null)} disabled={isSubmitting}>
              Keep grading
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              variant={pendingDecision === "rejected" ? "destructive" : "default"}
              aria-busy={isSubmitting}
            >
              {isSubmitting && <Spinner />}
              {pendingDecision === "approved" ? "Approve" : "Send back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
