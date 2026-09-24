"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TapeMark } from "@/components/brand/marks";

export interface LevelUpNotificationProps {
  level: number;
  onDismiss: () => void;
}

export function LevelUpNotification({ level, onDismiss }: LevelUpNotificationProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="level-up-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-heading"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-4 flex w-full max-w-sm flex-col items-center gap-6 rounded-md border border-border bg-sheet px-8 py-10 text-center"
        >
          <div className="flex items-end gap-3" aria-hidden="true">
            <motion.span
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="text-primary"
            >
              <TapeMark className="size-14" />
            </motion.span>
            <span className="font-condensed tabular text-[5.5rem] leading-[0.8] font-extrabold tracking-[-0.03em]">
              {level}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2
              id="level-up-heading"
              className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.02em]"
            >
              Level {level}.
            </h2>
            <p className="text-sm text-muted-foreground">
              Your XP just added another strip of tape. Rank still moves only when you pass a
              grading.
            </p>
          </div>

          <Button onClick={onDismiss} className="w-full" size="lg">
            Keep training
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
