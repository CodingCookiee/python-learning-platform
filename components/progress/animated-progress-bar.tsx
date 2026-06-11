"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedProgressBarProps {
  value: number;
  className?: string;
  barClassName?: string;
  delay?: number;
  showLabel?: boolean;
  /** Adds a shimmer sweep animation over the bar */
  shimmer?: boolean;
  "aria-label"?: string;
}

export function AnimatedProgressBar({
  value,
  className,
  barClassName,
  delay = 0,
  showLabel = false,
  shimmer = false,
  "aria-label": ariaLabel,
}: AnimatedProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="relative h-2 w-full overflow-hidden bg-muted"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <motion.div
          className={cn("relative h-full bg-primary overflow-hidden", barClassName)}
          initial={{ width: "0%" }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay }}
        >
          {shimmer && (
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          )}
        </motion.div>
      </div>
      {showLabel && (
        <span className="font-heading text-xs font-semibold tabular-nums text-muted-foreground whitespace-nowrap">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
