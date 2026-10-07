"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ConfettiEffect } from "@/components/animations";
import { Seal } from "@/components/brand/seal";
import { Sensei } from "@/components/quest/sensei";
import { SENSEI } from "@/lib/quest-steps";

/**
 * The end of the first-session quest: the sensei, pleased, and the Ready to Train seal. Shown once,
 * when the panel sees the quest finish. It's the celebration, so the badge isn't toasted as well.
 */
export function QuestFarewell({
  open,
  onOpenChange,
  xp,
  lessonHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ready to Train's XP; left out when it isn't known */
  xp: number | null;
  /** The learner's first lesson, to finish next */
  lessonHref: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <>
      {open && !reduceMotion && <ConfettiEffect />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-5 text-center sm:p-8">
          <div className="flex items-end justify-center gap-4">
            <Sensei mood="pleased" className="h-27 w-24" />
            <Seal label="Earned" detail={SENSEI.farewell.title} animate={!reduceMotion} />
          </div>
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-condensed text-4xl leading-none font-extrabold tracking-[-0.02em]">
              {SENSEI.farewell.title}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">{SENSEI.farewell.line}</DialogDescription>
          </div>
          {xp !== null && <p className="font-condensed tabular text-lg font-bold text-primary">+{xp} XP</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href={lessonHref} onClick={() => onOpenChange(false)}>
                Finish lesson 1
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/dashboard" onClick={() => onOpenChange(false)}>
                Back to the dashboard
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
