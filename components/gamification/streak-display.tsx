"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
  size?: "sm" | "md";
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  className,
  size = "md",
}: StreakDisplayProps) {
  const isSmall = size === "sm";

  return (
    <div className={cn("flex flex-col items-start gap-0.5", className)}>
      <div className={cn("flex items-center", isSmall ? "gap-1.5" : "gap-2")}>
        {/* Pulsing fire emoji */}
        <motion.span
          aria-hidden="true"
          className={cn("inline-block", isSmall ? "text-lg" : "text-2xl")}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          🔥
        </motion.span>

        {/* Current streak number */}
        <span className={cn("font-heading font-semibold", isSmall ? "text-xl" : "text-3xl")}>
          {currentStreak}
        </span>

        {/* "day streak" label */}
        <span
          className={cn(
            "font-heading font-semibold tracking-widest uppercase text-muted-foreground",
            isSmall ? "text-[0.55rem]" : "text-xs"
          )}
        >
          day streak
        </span>
      </div>

      {/* Best streak */}
      <p className={cn("text-muted-foreground", isSmall ? "text-[0.6rem]" : "text-xs")}>
        Best: {longestStreak} days
      </p>
    </div>
  );
}
