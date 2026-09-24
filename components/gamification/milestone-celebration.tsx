"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConfettiEffect } from "@/components/animations";
import { Seal } from "@/components/brand/seal";

export interface MilestoneCelebrationProps {
  /** 25 | 50 | 75 | 100 */
  percentage: number;
  onDismiss: () => void;
}

const MILESTONE_CONFIG: Record<number, { heading: string; sub: string }> = {
  25: {
    heading: "A quarter of the syllabus.",
    sub: "The foundations are behind you. The next stretch is where Python starts to feel like yours.",
  },
  50: {
    heading: "Halfway through the syllabus.",
    sub: "Half the modules passed. Keep the streak going; review is what makes it stick.",
  },
  75: {
    heading: "Three quarters done.",
    sub: "You're into the applied modules now. Black belt is in sight.",
  },
  100: {
    heading: "Syllabus complete.",
    sub: "Every module of the Python track, passed. Time to go for your black belt gradings.",
  },
};

export function MilestoneCelebration({ percentage, onDismiss }: MilestoneCelebrationProps) {
  const config = MILESTONE_CONFIG[percentage] ?? {
    heading: `${percentage}% of the syllabus.`,
    sub: "Keep training.",
  };

  return (
    <AnimatePresence>
      <motion.div
        key="milestone-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-heading"
      >
        <ConfettiEffect />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-4 flex w-full max-w-sm flex-col items-center gap-7 rounded-md border border-border bg-sheet px-8 py-10 text-center"
        >
          <Seal label={`${percentage}%`} detail="of the syllabus" animate className="scale-150" />

          <div className="mt-2 flex flex-col gap-2">
            <h2
              id="milestone-heading"
              className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.02em]"
            >
              {config.heading}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{config.sub}</p>
          </div>

          <Button onClick={onDismiss} className="w-full" size="lg">
            Keep training
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
