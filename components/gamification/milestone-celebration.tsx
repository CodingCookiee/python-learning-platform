"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfettiEffect } from "@/components/animations";
import { Dialog, DialogContent, DialogDescription, DialogPortal, DialogTitle } from "@/components/ui/dialog";
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

/**
 * A share of the syllabus passed. Built on the app's dialog, so focus moves into it, stays there,
 * and goes back where it was when it closes; Escape or a click outside closes it like the button.
 */
export function MilestoneCelebration({ percentage, onDismiss }: MilestoneCelebrationProps) {
  const config = MILESTONE_CONFIG[percentage] ?? {
    heading: `${percentage}% of the syllabus.`,
    sub: "Keep training.",
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-w-sm flex-col items-center gap-7 px-8 py-10 text-center"
      >
        <Seal label={`${percentage}%`} detail="of the syllabus" animate className="scale-150" />

        <div className="mt-2 flex flex-col gap-2">
          <DialogTitle className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.02em]">
            {config.heading}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {config.sub}
          </DialogDescription>
        </div>

        <Button onClick={onDismiss} className="w-full" size="lg">
          Keep training
        </Button>
      </DialogContent>
      {/* The falling cloth over the sheet; it takes no clicks and isn't read out */}
      <DialogPortal>
        <ConfettiEffect />
      </DialogPortal>
    </Dialog>
  );
}
