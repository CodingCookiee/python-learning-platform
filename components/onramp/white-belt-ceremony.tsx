"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ConfettiEffect } from "@/components/animations";
import { Seal } from "@/components/brand/seal";
import { BeltTying } from "@/components/brand/belt-tying";

/**
 * Shown once, when finishing the last on-ramp lesson earns White Belt Tied: the end of
 * "Start here" and the hand-over to module 1.
 */
export function WhiteBeltCeremony({
  open,
  onOpenChange,
  xp,
  lessons,
  nextHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The White Belt Tied achievement's XP */
  xp: number;
  lessons: number;
  /** Module 1's page */
  nextHref: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <>
      {open && !reduceMotion && <ConfettiEffect />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-5 text-center sm:p-8">
          <Seal label="Tied" detail="White belt" animate={!reduceMotion} className="mx-auto" />
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-condensed text-4xl leading-none font-extrabold tracking-[-0.02em]">
              Your white belt is tied
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              You&apos;ve finished Start here: programs, names, decisions, loops and your own functions. Module 1 builds
              on all of it, so it&apos;ll feel like a review with new tricks.
            </DialogDescription>
          </div>
          <BeltTying done={lessons} total={lessons} />
          <p className="font-condensed tabular text-lg font-bold text-primary">+{xp} XP</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href={nextHref}>
                Start module 1
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/dashboard">Back to the dashboard</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
