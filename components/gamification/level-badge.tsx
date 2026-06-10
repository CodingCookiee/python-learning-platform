"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LevelBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: {
    wrapper: "px-1.5 py-0.5 gap-1 text-[0.6rem]",
    icon: "size-2.5",
  },
  md: {
    wrapper: "px-2 py-1 gap-1.5 text-xs",
    icon: "size-3",
  },
  lg: {
    wrapper: "px-3 py-1.5 gap-2 text-sm",
    icon: "size-4",
  },
};

export function LevelBadge({ level, size = "md", className }: LevelBadgeProps) {
  const styles = sizeStyles[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary text-primary-foreground font-heading font-semibold tracking-widest uppercase",
        styles.wrapper,
        className
      )}
      aria-label={`Level ${level}`}
    >
      <Star className={cn(styles.icon, "shrink-0")} aria-hidden="true" />
      Lvl {level}
    </span>
  );
}
