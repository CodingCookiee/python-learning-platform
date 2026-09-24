"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SealMark } from "@/components/brand/marks";

const MILESTONES = [
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "Complete" },
] as const;

interface MilestoneTrackerProps {
  value: number;
  className?: string;
}

export function MilestoneTracker({ value, className }: MilestoneTrackerProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  // Fill width: percentage along the track (0% to 100%)
  const fillPercent = Math.min(100, clampedValue);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative flex items-center">
        {/* Background track */}
        <div className="absolute left-0 right-0 h-0.5 bg-muted" aria-hidden="true" />
        {/* Animated fill track */}
        <motion.div
          className="absolute left-0 h-0.5 bg-primary origin-left"
          initial={{ width: "0%" }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          aria-hidden="true"
        />
        {/* Milestone nodes */}
        <div className="relative flex w-full justify-between">
          {MILESTONES.map((milestone) => {
            const reached = clampedValue >= milestone.value;
            const isCurrent =
              !reached && clampedValue >= milestone.value - 25 && clampedValue < milestone.value;

            return (
              <div key={milestone.value} className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <div
                    className={cn(
                      "font-condensed tabular relative z-10 flex size-8 items-center justify-center rounded-sm border text-xs font-bold",
                      reached
                        ? "bg-primary text-primary-foreground border-primary"
                        : isCurrent
                          ? "bg-background text-primary border-primary"
                          : "bg-sheet text-muted-foreground border-border"
                    )}
                    aria-label={`${milestone.label}${reached ? " — reached" : isCurrent ? " — in progress" : " — not yet reached"}`}
                  >
                    {milestone.value === 100 ? (
                      <SealMark className="size-4" />
                    ) : reached ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      milestone.value
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "font-condensed text-xs font-semibold whitespace-nowrap",
                    reached ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {milestone.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
