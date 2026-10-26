"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TapeMark } from "@/components/brand/marks";

export interface LevelUpNotificationProps {
  level: number;
  onDismiss: () => void;
}

/**
 * A new level, announced. Built on the app's dialog, so focus moves into it, stays there, and goes
 * back where it was when it closes; Escape or a click outside closes it like the button.
 */
export function LevelUpNotification({ level, onDismiss }: LevelUpNotificationProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-w-sm flex-col items-center gap-6 px-8 py-10 text-center"
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
          <DialogTitle className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.02em]">
            Level {level}.
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your XP just added another strip of tape. Rank still moves only when you pass a grading.
          </DialogDescription>
        </div>

        <Button onClick={onDismiss} className="w-full" size="lg">
          Keep training
        </Button>
      </DialogContent>
    </Dialog>
  );
}
