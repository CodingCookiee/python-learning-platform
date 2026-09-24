"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Confetti } from "./confetti";
import { AchievementPatch } from "./achievement-badge";
import { tierStyle } from "@/lib/achievement-tier";
import { TapeMark } from "@/components/brand/marks";

export interface AchievementUnlockModalProps {
  open: boolean;
  onClose: () => void;
  achievement: {
    name: string;
    description: string;
    icon: string;
    tier: string;
    category: string;
    xpReward: number;
  } | null;
}

export function AchievementUnlockModal({ open, onClose, achievement }: AchievementUnlockModalProps) {
  if (!open || !achievement) return null;
  const t = tierStyle(achievement.tier);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievement-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-md border border-border bg-sheet p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <Confetti active={open} />

        <div className="flex flex-col items-center gap-6 text-center">
          {/* The patch is sewn on: it settles into place */}
          <motion.div
            key={achievement.name}
            initial={{ opacity: 0, scale: 1.25, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <AchievementPatch icon={achievement.icon} tier={achievement.tier} size="lg" />
          </motion.div>

          <div className="flex flex-col items-center gap-2">
            <h2
              id="achievement-title"
              className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.02em]"
            >
              {achievement.name}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{achievement.description}</p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span
              className="font-condensed rounded-sm border-2 px-2 py-0.5 font-bold"
              style={{ borderColor: t.thread, color: t.key === "legendary" ? undefined : t.ink }}
            >
              {t.label} patch
            </span>
            <span className="font-condensed tabular inline-flex items-center gap-1.5 rounded-sm bg-highlight px-2 py-0.5 font-bold text-highlight-foreground">
              <TapeMark className="size-3.5" />+{achievement.xpReward} XP
            </span>
          </div>

          <Button className="w-full" size="lg" onClick={onClose}>
            Keep training
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
