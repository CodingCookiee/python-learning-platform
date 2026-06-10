"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-heading"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
          className="relative mx-4 flex flex-col items-center gap-6 rounded-lg border border-border bg-card px-10 py-10 shadow-xl text-center max-w-sm w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.6, times: [0, 0.6, 1], ease: "easeOut" }}
            className="flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            aria-hidden="true"
          >
            <span className="font-heading text-4xl font-bold">{level}</span>
          </motion.div>

          <div className="flex flex-col gap-1">
            <h2 id="level-up-heading" className="font-heading text-2xl font-bold tracking-tight">
              Level Up!
            </h2>
            <p className="text-muted-foreground text-sm">You reached Level {level}</p>
          </div>

          <Button onClick={onDismiss} className="w-full" aria-label="Dismiss level up notification">
            Awesome!
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
