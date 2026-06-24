"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedProgressBar } from "./animated-progress-bar";
import { getCurriculumPhaseLabel } from "@/lib/curriculum";

export interface ModuleProgressCardProps {
  moduleId: string;
  title: string;
  phase: number | string;
  completionPercentage: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  projectsCompleted?: number;
  projectsTotal?: number;
  isLocked?: boolean;
  prerequisiteNames?: string[];
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
  prerequisiteNames = [],
  href,
}: ModuleProgressCardProps) {
  const linkHref = href ?? `/modules/${moduleId}`;
  const isComplete = completionPercentage >= 100;
  const prevLockedRef = React.useRef(isLocked);
  const [justUnlocked, setJustUnlocked] = React.useState(false);

  React.useEffect(() => {
    if (prevLockedRef.current && !isLocked) {
      setJustUnlocked(true);
      const t = setTimeout(() => setJustUnlocked(false), 800);
      return () => clearTimeout(t);
    }
    prevLockedRef.current = isLocked;
  }, [isLocked]);

  const lockTooltip =
    prerequisiteNames.length > 0
      ? `Complete first: ${prerequisiteNames.join(", ")}`
      : "Complete prerequisite modules to unlock";

  const card = (
    <motion.div
      animate={justUnlocked ? { scale: [1, 1.04, 1] } : {}}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col gap-3 bg-card ring-1 ring-foreground/5 p-6 transition-shadow",
        !isLocked && "hover:shadow-md",
        isLocked && "opacity-60"
      )}
    >
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
          <AnimatePresence>
            {isLocked && (
              <motion.span
                key="lock"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.2 }}
              >
                <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
              </motion.span>
            )}
          </AnimatePresence>
          <Badge variant="secondary">{getCurriculumPhaseLabel(String(phase))}</Badge>
        </div>
      </div>
      <AnimatedProgressBar value={completionPercentage} delay={0.1} showLabel={false} />
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
      <div className="mt-1">
        {isComplete ? (
          <Link
            href={linkHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Review
          </Link>
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
    </motion.div>
  );

  if (!isLocked) return card;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{card}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          <p>{lockTooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
