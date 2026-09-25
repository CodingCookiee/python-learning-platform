"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/animations";
import { Check, ExternalLink, FileText } from "lucide-react";
import { Seal } from "@/components/brand/seal";
import { SealMark } from "@/components/brand/marks";
import type { SubmissionDetail } from "../page";

interface EvaluateClientProps {
  submission: SubmissionDetail;
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

export function EvaluateClient({ submission }: EvaluateClientProps) {
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
                <li key={i} className="flex items-center justify-between gap-3 border-b border-border py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate font-mono text-sm">{file.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-condensed tabular text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    {hasDownloadableContent(file) ? (
                      <Button size="xs" variant="outline" asChild>
                        <a
                          href={`/api/admin/projects/submissions/${submission.id}/file/${i}`}
                          download={file.name}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground" title="The file content wasn't stored with this submission">
                        Not stored
                      </span>
                    )}
                  </span>
                </li>
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
            rows={5}
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
              {isSubmitting && <Spinner size="sm" />}
              {pendingDecision === "approved" ? "Approve" : "Send back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
