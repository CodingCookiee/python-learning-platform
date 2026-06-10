"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Download,
  BookOpen,
  Target,
  ListChecks,
  PackageOpen,
  ExternalLink,
} from "lucide-react";

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

function SubmissionStatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "approved":
      return (
        <Badge className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
          <CheckCircle2 className="size-3" aria-hidden="true" />
          Approved
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <Clock className="size-3" aria-hidden="true" />
          Under Review
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="destructive" className="flex items-center gap-1.5">
          Needs Revision
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ProjectDetailClient({ project }: ProjectDetailClientProps) {
  const isCompleted = project.submission?.status?.toLowerCase() === "approved";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Main content column */}
      <div className="flex flex-col gap-8 lg:col-span-2">
        {/* Header */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="text-muted-foreground">Phase {project.module.phase}</Badge>
            <Badge variant="secondary" className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="size-3" aria-hidden="true" />
              {project.module.title}
            </Badge>
            {project.submission && <SubmissionStatusBadge status={project.submission.status} />}
          </div>

          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{project.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              {project.estimatedTime}h estimated
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5" aria-hidden="true" />
              {project.xpReward} XP reward
            </span>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
        </motion.div>

        {/* Requirements */}
        <motion.section
          aria-labelledby="requirements-heading"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <h2
            id="requirements-heading"
            className="mb-4 flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            <Target className="size-3.5" aria-hidden="true" />
            Requirements
          </h2>
          <Card>
            <CardContent className="pt-5 pb-5">
              {project.requirements.length > 0 ? (
                <ol className="flex flex-col gap-3">
                  {project.requirements.map((req, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-heading mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-relaxed">{req}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No requirements specified.</p>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* Success Criteria */}
        <motion.section
          aria-labelledby="success-criteria-heading"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <h2
            id="success-criteria-heading"
            className="mb-4 flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            <ListChecks className="size-3.5" aria-hidden="true" />
            Success Criteria and Deliverables
          </h2>
          <Card>
            <CardContent className="pt-5 pb-5">
              {project.successCriteria.length > 0 ? (
                <ul className="flex flex-col gap-3">
                  {project.successCriteria.map((criterion, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                      <span className="leading-relaxed">{criterion}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No success criteria specified.</p>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {/* Starter Template */}
        {project.starterTemplate && (
          <motion.section
            aria-labelledby="starter-template-heading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15 }}
          >
            <h2
              id="starter-template-heading"
              className="mb-4 flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              <PackageOpen className="size-3.5" aria-hidden="true" />
              Starter Template
            </h2>
            <Card>
              <CardContent className="flex flex-col gap-4 pt-5 pb-5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A starter template is provided to help you get up and running quickly. Download it
                  to get the project structure, boilerplate code, and any required configuration
                  files.
                </p>
                <Button variant="outline" className="w-fit" asChild>
                  <a
                    href={project.starterTemplate}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download starter template"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    Download Starter Template
                    <ExternalLink data-icon="inline-end" className="size-3" aria-hidden="true" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.section>
        )}

        {/* Submission feedback */}
        {project.submission?.feedback && (
          <motion.section
            aria-labelledby="feedback-heading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
          >
            <h2
              id="feedback-heading"
              className="mb-4 font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Feedback
            </h2>
            <Card>
              <CardContent className="pt-5 pb-5">
                <p className="text-sm leading-relaxed">{project.submission.feedback}</p>
              </CardContent>
            </Card>
          </motion.section>
        )}
      </div>

      {/* Sidebar column */}
      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        {/* CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              {isCompleted ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Project Complete
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You have successfully completed this project.
                  </p>
                  <Button
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled
                  >
                    Complete
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/modules/${project.module.id}`}>
                      Back to Module
                      <ExternalLink data-icon="inline-end" className="size-3" aria-hidden="true" />
                    </Link>
                  </Button>
                </>
              ) : project.submission ? (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-semibold">Submission Under Review</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your submission is being evaluated. Check back soon for feedback.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/modules/${project.module.id}`}>Back to Module</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Ready to start? Build the project by following the requirements and success
                    criteria above.
                  </p>
                  <Button className="w-full" asChild>
                    <Link href={`/projects/${project.id}/submit`}>
                      Start Project
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Link>
                  </Button>
                  {project.starterTemplate && (
                    <Button variant="outline" className="w-full" asChild>
                      <a
                        href={project.starterTemplate}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="size-4" aria-hidden="true" />
                        Get Starter Template
                      </a>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Overview stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                <div className="flex flex-col gap-0.5 text-center">
                  <span className="font-heading text-lg font-semibold">
                    {project.estimatedTime}h
                  </span>
                  <span className="text-xs text-muted-foreground">estimated</span>
                </div>
                <div className="flex flex-col gap-0.5 text-center">
                  <span className="font-heading text-lg font-semibold">
                    {project.requirements.length}
                  </span>
                  <span className="text-xs text-muted-foreground">requirements</span>
                </div>
                <div className="flex flex-col gap-0.5 text-center">
                  <span className="font-heading text-lg font-semibold">{project.xpReward}</span>
                  <span className="text-xs text-muted-foreground">XP reward</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Parent module */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Module</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/modules/${project.module.id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Go to module: ${project.module.title}`}
              >
                <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{project.module.title}</span>
                <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
