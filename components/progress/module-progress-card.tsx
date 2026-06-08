"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { AnimatedProgressBar } from "./animated-progress-bar";

export interface ModuleProgressCardProps {
  moduleId: string;
  title: string;
  phase: number;
  completionPercentage: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  projectsCompleted?: number;
  projectsTotal?: number;
  isLocked?: boolean;
  href?: string;
}

export function ModuleProgressCard({
  moduleId,
  title,
  phase,
  completionPercentage,
  lessonsCompleted,
  lessonsTotal,
  projectsCompleted,
  projectsTotal,
  isLocked = false,
  href,
}: ModuleProgressCardProps) {
  const linkHref = href ?? `/modules/${moduleId}`;
  const isComplete = completionPercentage >= 100;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 bg-card ring-1 ring-foreground/5 p-6 transition-shadow",
        !isLocked && "hover:shadow-md",
        isLocked && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <p
            className={cn(
              "font-heading text-xs font-semibold tracking-widest uppercase truncate",
              isLocked ? "text-muted-foreground/60" : "text-foreground"
            )}
          >
            {title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isLocked && <Lock className="size-3 text-muted-foreground" aria-hidden="true" />}
          <Badge variant="secondary">Phase {phase}</Badge>
        </div>
      </div>

      {/* Progress bar */}
      <AnimatedProgressBar value={completionPercentage} delay={0.1} showLabel={false} />

      {/* Stats */}
      <p className="text-xs text-muted-foreground">
        {lessonsCompleted}/{lessonsTotal} lessons
        {projectsTotal != null && projectsTotal > 0 && (
          <>
            {" "}
            &middot; {projectsCompleted ?? 0}/{projectsTotal} projects
          </>
        )}
        <span className="ml-1 font-semibold">{completionPercentage}%</span>
      </p>

      {/* Footer action */}
      <div className="mt-1">
        {isComplete ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Complete
          </span>
        ) : isLocked ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            Locked
          </span>
        ) : (
          <Link
            href={linkHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Continue
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
