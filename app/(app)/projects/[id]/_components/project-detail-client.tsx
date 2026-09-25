"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConfettiEffect } from "@/components/animations";
import { ArrowRight, Clock, Download } from "lucide-react";
import { TapeMark } from "@/components/brand/marks";
import { Seal } from "@/components/brand/seal";

export interface ProjectSubmission {
  id: string;
  status: string;
  feedback: string | null;
  submittedAt: string;
  evaluatedAt: string | null;
}

export interface ProjectDetailData {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  successCriteria: string[];
  starterTemplate: string | null;
  estimatedTime: number;
  xpReward: number;
  module: {
    id: string;
    title: string;
    order: number;
    phase: string;
  };
  submission: ProjectSubmission | null;
}

interface ProjectDetailClientProps {
  project: ProjectDetailData;
}

function getSubmissionState(status?: string | null): "none" | "pending" | "rejected" | "approved" {
  switch (status?.toLowerCase()) {
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    case "rejected":
      return "rejected";
    default:
      return "none";
  }
}

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const submissionState = getSubmissionState(project.submission?.status);
  const isCompleted = submissionState === "approved";
  const needsRevision = submissionState === "rejected";
  const isUnderReview = submissionState === "pending";
  const evaluatedAt = project.submission?.evaluatedAt ?? null;

  // Lazily initialise confetti so the sessionStorage check runs only once --
  // avoids calling setState synchronously inside a useEffect body.
  const submissionId = project.submission?.id ?? null;
  const [showConfetti, setShowConfetti] = React.useState<boolean>(() => {
    if (!isCompleted || !evaluatedAt || !submissionId) return false;
    if (typeof window === "undefined") return false;
    const seenKey = `confetti_seen_${submissionId}`;
    if (sessionStorage.getItem(seenKey)) return false;
    sessionStorage.setItem(seenKey, "1");
    return true;
  });

  const status = {
    approved: { label: "Approved", className: "bg-success/12 text-success" },
    pending: { label: "Under review", className: "bg-accent text-foreground" },
    rejected: { label: "Needs revision", className: "bg-destructive/10 text-destructive" },
    none: { label: "Not started", className: "bg-muted text-muted-foreground" },
  }[submissionState];

  return (
    <div className="relative grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      <div className="flex min-w-0 flex-col gap-10">
        <motion.header
          className="flex flex-col gap-4 border-b border-border pb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <h1 className="font-condensed text-5xl leading-[0.95] font-extrabold tracking-[-0.02em]">
            {project.title}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {project.description}
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span className={`rounded-sm px-1.5 font-semibold ${status.className}`}>{status.label}</span>
            <span className="text-muted-foreground">
              Capstone for{" "}
              <Link href={`/modules/${project.module.id}`} className="font-medium text-foreground underline">
                module {project.module.order}, {project.module.title}
              </Link>
            </span>
            <span className="font-condensed tabular text-muted-foreground">~{project.estimatedTime} h</span>
            <span className="font-condensed tabular inline-flex items-center gap-1 text-muted-foreground">
              <TapeMark className="size-3.5" />
              {project.xpReward} XP on approval
            </span>
          </p>
        </motion.header>

        {project.submission?.feedback && (
          <section
            aria-labelledby="feedback-heading"
            className="flex flex-col gap-2 rounded-md bg-accent/60 px-5 py-4"
          >
            <h2 id="feedback-heading" className="font-semibold">
              Examiner&apos;s feedback
            </h2>
            <p className="leading-relaxed whitespace-pre-line">{project.submission.feedback}</p>
          </section>
        )}

        <section aria-labelledby="requirements-heading" className="flex flex-col gap-4">
          <h2 id="requirements-heading" className="text-2xl font-semibold">
            What to build
          </h2>
          {project.requirements.length > 0 ? (
            <ol className="flex flex-col border-t border-border">
              {project.requirements.map((req, i) => (
                <li key={i} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-border py-3.5">
                  <span className="font-condensed tabular text-lg font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No requirements listed yet.</p>
          )}
        </section>

        <section aria-labelledby="criteria-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="criteria-heading" className="text-2xl font-semibold">
              How it&apos;s graded
            </h2>
            <p className="text-muted-foreground">
              The examiner checks your submission against each of these.
            </p>
          </div>
          {project.successCriteria.length > 0 ? (
            <ul className="flex flex-col border-t border-border">
              {project.successCriteria.map((criterion, i) => (
                <li key={i} className="flex items-start gap-3 border-b border-border py-3.5">
                  <span
                    className="mt-1 size-4 shrink-0 rounded-[3px] border border-(--keyline)/60"
                    aria-hidden="true"
                  />
                  <span className="leading-relaxed">{criterion}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No criteria listed yet.</p>
          )}
        </section>

        {project.starterTemplate && (
          <section
            aria-labelledby="starter-heading"
            className="grid gap-4 rounded-md border border-border bg-sheet p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="flex flex-col gap-1">
              <h2 id="starter-heading" className="font-semibold">
                Starter template
              </h2>
              <p className="text-sm text-muted-foreground">
                Project structure and boilerplate so you can start on the interesting part.
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href={project.starterTemplate} download target="_blank" rel="noopener noreferrer">
                <Download aria-hidden="true" />
                Download
              </a>
            </Button>
          </section>
        )}
      </div>

      {/* One action panel: what to do next with this project */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex flex-col gap-4 rounded-md border border-border bg-sheet p-6">
          {isCompleted ? (
            <>
              <Seal label="Passed" detail="Capstone graded" className="my-2 self-start" />
              <p className="text-sm text-muted-foreground">
                This capstone passed its grading and the XP is on your record.
              </p>
            </>
          ) : isUnderReview ? (
            <>
              <span className="flex items-center gap-2 font-semibold">
                <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
                With the examiner
              </span>
              <p className="text-sm text-muted-foreground">
                Your submission is waiting for review. Feedback shows up on this page.
              </p>
            </>
          ) : needsRevision ? (
            <>
              <span className="font-semibold text-destructive">Needs revision</span>
              <p className="text-sm text-muted-foreground">
                Read the examiner&apos;s feedback, make the changes, then submit again.
              </p>
              <Button size="lg" asChild>
                <Link href={`/projects/${project.id}/submit`}>
                  Resubmit
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <span className="font-semibold">Build it in your own editor</span>
              <p className="text-sm text-muted-foreground">
                Capstones are real projects. When every item under “How it&apos;s graded” is true,
                submit a GitHub link or your files.
              </p>
              <Button size="lg" asChild>
                <Link href={`/projects/${project.id}/submit`}>
                  Submit project
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}
          <Link
            href={`/modules/${project.module.id}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Back to {project.module.title}
          </Link>
        </div>
      </aside>
    </div>
  );
}
