"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Confetti } from "./confetti";
import { cn } from "@/lib/utils";
import { renderAchievementIcon } from "@/lib/achievement-icon";

export interface AchievementUnlockModalProps {
  open: boolean;
  onClose: () => void;
  achievement: {
    name: string;
    description: string;
    icon: string;
    tier: "bronze" | "silver" | "gold" | "platinum";
    category: string;
    xpReward: number;
  } | null;
}

const tierBgStyles: Record<string, string> = {
  gold: "bg-yellow-500/5",
  silver: "bg-slate-400/5",
  bronze: "bg-amber-700/5",
  platinum: "bg-violet-400/5",
};

const tierTextStyles: Record<string, string> = {
  gold: "text-yellow-500",
  silver: "text-slate-400",
  bronze: "text-amber-700",
  platinum: "text-violet-400",
};

export function AchievementUnlockModal({
  open,
  onClose,
  achievement,
}: AchievementUnlockModalProps) {
  const tier = achievement?.tier ?? "bronze";
  const tierBg = tierBgStyles[tier] ?? "";
  const tierText = tierTextStyles[tier] ?? "text-muted-foreground";

  if (!open || !achievement) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-title"
      >
        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "relative w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-lg border border-border bg-background p-6 shadow-xl",
            tierBg
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Confetti */}
          <Confetti active={open} />

          {/* Content */}
          <div className="flex flex-col items-center gap-5 text-center">
            {/* Animated icon */}
            <motion.div
              key={achievement.name}
              className="flex size-16 items-center justify-center text-5xl"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
            >
              {renderAchievementIcon({
                iconName: achievement.icon,
                size: 48,
                className: "text-foreground",
                ariaLabel: achievement.name,
              })}
            </motion.div>

            {/* Header */}
            <div className="flex flex-col items-center gap-1">
              <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                Achievement Unlocked!
              </p>
              <h2
                id="achievement-title"
                className="font-heading text-xl font-normal tracking-normal"
              >
                {achievement.name}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {achievement.description}
              </p>
            </div>

            {/* Tier + XP row */}
            <div className="flex items-center gap-3">
              <Badge className={cn("border px-2 py-0.5", tierText)}>{achievement.tier}</Badge>
              <Badge className="border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-yellow-600 dark:text-yellow-400">
                +{achievement.xpReward} XP
              </Badge>
            </div>

            {/* Close button */}
            <Button className="w-full" onClick={onClose}>
              Awesome!
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
}
