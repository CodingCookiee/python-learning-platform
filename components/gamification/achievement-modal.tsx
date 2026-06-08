"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Confetti } from "./confetti";
import { cn } from "@/lib/utils";

export interface AchievementModalProps {
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

export function AchievementModal({ open, onClose, achievement }: AchievementModalProps) {
  const tier = achievement?.tier ?? "bronze";
  const tierBg = tierBgStyles[tier] ?? "";
  const tierText = tierTextStyles[tier] ?? "text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn("relative overflow-hidden sm:max-w-sm", tierBg)}
      >
        {/* Confetti overlaid inside the modal */}
        <Confetti active={open} />

        <div className="flex flex-col items-center gap-5 text-center">
          {achievement && (
            <>
              {/* Animated icon */}
              <motion.span
                key={achievement.name}
                className="text-5xl"
                role="img"
                aria-label={achievement.name}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                {achievement.icon}
              </motion.span>

              <DialogHeader className="items-center gap-1">
                <p className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  Achievement Unlocked!
                </p>
                <DialogTitle className="text-center font-heading text-xl normal-case tracking-normal">
                  {achievement.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {achievement.description}
                </p>
              </DialogHeader>

              {/* Tier + XP row */}
              <div className="flex items-center gap-3">
                <Badge className={cn("border px-2 py-0.5", tierText)}>{achievement.tier}</Badge>
                <Badge className="border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-yellow-600 dark:text-yellow-400">
                  +{achievement.xpReward} XP
                </Badge>
              </div>

              <DialogFooter className="w-full sm:justify-center">
                <Button className="w-full" onClick={onClose}>
                  Awesome!
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
