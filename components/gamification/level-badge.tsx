import * as React from "react";
import { cn } from "@/lib/utils";
import { TapeMark } from "@/components/brand/marks";

export interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: { wrapper: "h-6 gap-1 px-1.5 text-xs", icon: "size-3.5" },
  md: { wrapper: "h-7 gap-1.5 px-2 text-sm", icon: "size-4" },
  lg: { wrapper: "h-9 gap-2 px-3 text-base", icon: "size-5" },
};

/** XP level, shown as a strip of tape: level is what XP builds up */
export function LevelBadge({ level, size = "md", className }: LevelBadgeProps) {
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-sm border border-border bg-sheet font-semibold",
        styles.wrapper,
        className
      )}
      aria-label={`Level ${level}`}
    >
      <TapeMark className={cn(styles.icon, "text-primary")} />
      <span className="font-condensed tabular">Level {level}</span>
    </span>
  );
}
