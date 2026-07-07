"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedProgressBar } from "@/components/progress";
import { LevelUpNotification } from "./level-up-notification";

export interface XpProgressBarProps {
  xp: number;
  level: number;
  className?: string;
}

function xpForLevel(n: number): number {
  return n * 500;
}

export function XpProgressBar({ xp, level, className }: XpProgressBarProps) {
  const prevLevelRef = useRef(level);
  const [levelUp, setLevelUp] = React.useState(false);
  const [showLevelUpNotification, setShowLevelUpNotification] = React.useState(false);

  const currentLevelThreshold = xpForLevel(level - 1);
  const xpInLevel = Math.max(0, Math.round(xp - currentLevelThreshold));
  const percentage = Math.min(100, Math.max(0, Math.round((xpInLevel / 500) * 100)));

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLevelUp(true);
      setShowLevelUpNotification(true);
      const timer = setTimeout(() => setLevelUp(false), 800);
      prevLevelRef.current = level;
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = level;
  }, [level]);

  return (
    <>
      {showLevelUpNotification && (
        <LevelUpNotification level={level} onDismiss={() => setShowLevelUpNotification(false)} />
      )}
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-center gap-2">
          {/* Current level badge */}
          <motion.div
            animate={
              levelUp
                ? {
                    scale: [1, 1.3, 1],
                    boxShadow: [
                      "0 0 0px 0px transparent",
                      "0 0 8px 2px oklch(0.75 0.12 260)",
                      "0 0 0px 0px transparent",
                    ],
                  }
                : { scale: 1 }
            }
            transition={{ duration: 0.4 }}
            className="flex shrink-0 items-center justify-center bg-primary text-primary-foreground px-2 py-1"
          >
            <span className="font-heading text-[0.6rem] font-semibold tracking-widest uppercase whitespace-nowrap">
              Lvl {level}
            </span>
          </motion.div>

          {/* Progress bar */}
          <div className="flex-1">
            <AnimatedProgressBar
              value={percentage}
              showLabel
              aria-label={`${xpInLevel} of 500 XP toward level ${level + 1}`}
            />
          </div>

          {/* Next level badge */}
          <div className="flex shrink-0 items-center justify-center border border-border bg-muted px-2 py-1">
            <span className="font-heading text-[0.6rem] font-semibold tracking-widest uppercase whitespace-nowrap text-muted-foreground">
              Lvl {level + 1}
            </span>
          </div>
        </div>

        {/* XP text */}
        <p className="text-xs text-muted-foreground">
          {xpInLevel} / 500 XP to level {level + 1}
        </p>
      </div>
    </>
  );
}
