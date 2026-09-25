"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { LevelUpNotification } from "./level-up-notification";

export interface XpProgressBarProps {
  xp: number;
  level: number;
  className?: string;
}

const XP_PER_LEVEL = 500;
const SEGMENTS = 10; // one strip of tape per 50 XP

/**
 * XP toward the next level as a row of tape strips. A strip fills for every
 * 50 XP; the one being earned fills partially.
 */
export function XpProgressBar({ xp, level, className }: XpProgressBarProps) {
  const prevLevelRef = useRef(level);
  const [showLevelUp, setShowLevelUp] = React.useState(false);

  const xpInLevel = Math.max(0, Math.round(xp - (level - 1) * XP_PER_LEVEL));
  const clamped = Math.min(XP_PER_LEVEL, xpInLevel);
  const perSegment = XP_PER_LEVEL / SEGMENTS;

  useEffect(() => {
    if (level > prevLevelRef.current) setShowLevelUp(true);
    prevLevelRef.current = level;
  }, [level]);

  return (
    <>
      {showLevelUp && <LevelUpNotification level={level} onDismiss={() => setShowLevelUp(false)} />}
      <div className={cn("flex flex-col gap-2", className)}>
        <div
          className="flex h-5 gap-1"
          role="progressbar"
          aria-label={`${clamped} of ${XP_PER_LEVEL} XP toward level ${level + 1}`}
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={XP_PER_LEVEL}
        >
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const fill = Math.min(1, Math.max(0, (clamped - i * perSegment) / perSegment));
            return (
              <span key={i} className="relative flex-1 overflow-hidden rounded-[2px] bg-muted">
                <span
                  className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${fill * 100}%` }}
                />
              </span>
            );
          })}
        </div>
        <p className="font-condensed tabular text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{clamped}</span> / {XP_PER_LEVEL} XP to
          level {level + 1}
        </p>
      </div>
    </>
  );
}
