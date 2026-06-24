"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  User,
  Calendar,
  ListChecks,
  MessageSquare,
  StickyNote,
} from "lucide-react";
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
      router.push("/admin/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
      setPendingDecision(null);
    }
  }

  const { filesPayload } = submission;

  return (
    <div className="flex flex-col gap-6">
      {/* Submitter info */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="size-4" aria-hidden="true" />
              Submission Info
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Submitter
                </span>
                <span className="text-sm">
                  {submission.submitter.name ?? submission.submitter.email}
                </span>
                {submission.submitter.name && (
                  <span className="text-xs text-muted-foreground">
                    {submission.submitter.email}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Submitted
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {formatDate(submission.submittedAt)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Project
              </span>
              <span className="text-sm">{submission.project.title}</span>
              <span className="text-xs text-muted-foreground">
                {submission.project.module.title}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Submission content */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="size-4" aria-hidden="true" />
              Submission Content
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {filesPayload.type === "github" ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  GitHub Repository
                </span>
                <a
                  href={filesPayload.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 underline underline-offset-3 hover:text-blue-700 dark:text-blue-400"
                  aria-label="Open GitHub repository"
                >
                  {filesPayload.url}
                  <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Submitted Files
                </span>
                {filesPayload.files && filesPayload.files.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {filesPayload.files.map((file, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-3 border border-border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FileText
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="truncate font-medium">{file.name}</span>
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                          {hasDownloadableContent(file) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="h-7 px-2 text-xs"
                            >
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled
                              title="Original file content was not stored with this submission"
                            >
                              Unavailable
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No files listed.</p>
                )}
              </div>
            )}
            {filesPayload.notes && (
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <StickyNote className="size-3.5" aria-hidden="true" />
                  Notes from submitter
                </span>
                <p className="border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground">
                  {filesPayload.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Success criteria checklist */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <ListChecks className="size-4" aria-hidden="true" />
                Success Criteria
              </span>
              <Badge variant="secondary" className="text-xs">
                {passCount} / {checklistValues.length} passed
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission.project.successCriteria.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {submission.project.successCriteria.map((criterion, i) => {
                  const key = `criterion_${i}`;
                  const checked = checklist[key] ?? false;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        onClick={() => toggleCriterion(key)}
                        className="group flex w-full items-start gap-3 rounded-sm text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-pressed={checked}
                        aria-label={`${checked ? "Unmark" : "Mark"} criterion as passed: ${criterion}`}
                      >
                        <span
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                            checked
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-border bg-background group-hover:border-emerald-500/60"
                          }`}
                          aria-hidden="true"
                        >
                          {checked && <CheckCircle2 className="size-3.5" />}
                        </span>
                        <span
                          className={`text-sm leading-relaxed transition-colors ${
                            checked ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {criterion}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No success criteria defined.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="size-4" aria-hidden="true" />
              Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Textarea
              placeholder="Write feedback for the learner (minimum 20 characters)..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              aria-label="Feedback for the learner"
              className="resize-y"
            />
            <div className="flex items-center justify-between">
              <p
                className={`text-xs ${feedbackTrimmed.length > 0 && !feedbackValid ? "text-destructive" : "text-muted-foreground"}`}
              >
                {feedbackTrimmed.length} / 20 minimum characters
              </p>
              {!allPassed && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {passCount === 0
                    ? "No criteria marked as passed"
                    : `${checklistValues.length - passCount} criteria not yet passed`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row sm:justify-end"
      >
        <Button
          variant="outline"
          onClick={() => handleDecisionClick("rejected")}
          disabled={!feedbackValid || isSubmitting}
          className="flex items-center gap-2 border-destructive/50 text-destructive hover:border-destructive hover:bg-destructive/10"
          aria-label="Reject submission"
        >
          <XCircle className="size-4" aria-hidden="true" />
          Reject
        </Button>
        <Button
          onClick={() => handleDecisionClick("approved")}
          disabled={!feedbackValid || isSubmitting}
          className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          aria-label="Approve submission"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Approve
        </Button>
      </motion.div>

      {/* Confirmation dialog */}
      <Dialog
        open={pendingDecision !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setPendingDecision(null);
        }}
      >
        <DialogContent showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>
              {pendingDecision === "approved" ? "Approve Submission?" : "Reject Submission?"}
            </DialogTitle>
            <DialogDescription>
              {pendingDecision === "approved" ? (
                <>
                  You are about to approve this submission for{" "}
                  <strong>{submission.submitter.name ?? submission.submitter.email}</strong>.
                  {allPassed
                    ? " All criteria have been marked as passed."
                    : ` Note: only ${passCount} of ${checklistValues.length} criteria are marked as passed.`}{" "}
                  This action cannot be undone.
                </>
              ) : (
                <>
                  You are about to reject this submission for{" "}
                  <strong>{submission.submitter.name ?? submission.submitter.email}</strong>. The
                  learner will see your feedback and can resubmit. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDecision(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={
                pendingDecision === "approved"
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : ""
              }
              variant={pendingDecision === "rejected" ? "destructive" : "default"}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Submitting...
                </span>
              ) : pendingDecision === "approved" ? (
                "Confirm Approval"
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
