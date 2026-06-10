"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConfettiEffect } from "@/components/animations";

export interface MilestoneCelebrationProps {
  /** 25 | 50 | 75 | 100 */
  percentage: number;
  onDismiss: () => void;
}

const MILESTONE_CONFIG: Record<number, { emoji: string; heading: string; sub: string }> = {
  25: { emoji: "🎉", heading: "25% Done!", sub: "Quarter of the way through. Keep it up!" },
  50: {
    emoji: "💪",
    heading: "Halfway There!",
    sub: "You' + chr(39) + 're at 50% ? the momentum is real.",
  },
  75: { emoji: "🔥", heading: "75% Complete!", sub: "Almost there. The finish line is in sight!" },
  100: {
    emoji: "🏆",
    heading: "Curriculum Complete!",
    sub: "You' + chr(39) + 've finished the entire Python learning program. Incredible!",
  },
};

export function MilestoneCelebration({ percentage, onDismiss }: MilestoneCelebrationProps) {
  const config = MILESTONE_CONFIG[percentage] ?? {
    emoji: "🎉",
    heading: `${percentage}% Reached!`,
    sub: "Great progress!",
  };

  return (
    <AnimatePresence>
      <motion.div
        key="milestone-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-heading"
      >
        <ConfettiEffect />

        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="relative mx-4 flex max-w-sm w-full flex-col items-center gap-7 rounded-lg border border-border bg-card px-10 py-12 shadow-2xl text-center"
        >
          {/* Emoji */}
          <motion.span
            className="text-6xl"
            role="img"
            aria-hidden="true"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.25, 1] }}
            transition={{ duration: 0.55, times: [0, 0.65, 1], ease: "easeOut" }}
          >
            {config.emoji}
          </motion.span>

          {/* Percentage ring */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 20 }}
            className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            aria-hidden="true"
          >
            <span className="font-heading text-2xl font-bold">{percentage}%</span>
          </motion.div>

          <div className="flex flex-col gap-1.5">
            <h2 id="milestone-heading" className="font-heading text-2xl font-bold tracking-tight">
              {config.heading}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{config.sub}</p>
          </div>

          <Button onClick={onDismiss} className="w-full" size="lg">
            {percentage === 100 ? "🎉 Celebrate!" : "Keep Going!"}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
