import * as React from "react";
import { cn } from "@/lib/utils";
import { StreakMark } from "@/components/brand/marks";

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
  const active = currentStreak > 0;

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <div className="flex items-end gap-2">
        <StreakMark
          className={cn(isSmall ? "size-5" : "size-7", active ? "text-primary" : "text-muted-foreground")}
        />
        <span
          className={cn(
            "font-condensed tabular leading-[0.85] font-extrabold tracking-[-0.02em]",
            isSmall ? "text-2xl" : "text-4xl"
          )}
        >
          {currentStreak}
        </span>
        <span className={cn("pb-0.5 font-semibold", isSmall ? "text-xs" : "text-sm")}>
          {currentStreak === 1 ? "day" : "days"} in a row
        </span>
      </div>
      <p className={cn("tabular text-muted-foreground", isSmall ? "text-xs" : "text-sm")}>
        Longest: {longestStreak} {longestStreak === 1 ? "day" : "days"}
      </p>
    </div>
  );
}
