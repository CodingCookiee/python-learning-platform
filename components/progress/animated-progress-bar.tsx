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
}

export function AnimatedProgressBar({
  value,
  className,
  barClassName,
  delay = 0,
  showLabel = false,
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
      >
        <motion.div
          className={cn("h-full bg-primary", barClassName)}
          initial={{ width: "0%" }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay }}
        />
      </div>
      {showLabel && (
        <span className="font-heading text-xs font-semibold tabular-nums text-muted-foreground whitespace-nowrap">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
