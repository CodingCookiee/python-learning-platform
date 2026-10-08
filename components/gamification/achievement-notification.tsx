"use client";

import * as React from "react";
import { AchievementUnlockModal } from "./achievement-unlock-modal";
import type { UnlockedAchievement } from "@/lib/achievements";

export interface AchievementNotificationQueueProps {
  achievements: UnlockedAchievement[];
  /** Called once the last one has been dismissed (e.g. to move on to the next page) */
  onDone?: () => void;
}

export function AchievementNotificationQueue({ achievements, onDone }: AchievementNotificationQueueProps) {
  const [dismissedAchievementIds, setDismissedAchievementIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const current =
    achievements.find((achievement) => !dismissedAchievementIds.has(achievement.id)) ?? null;

  const handleClose = () => {
    if (current) {
      const dismissed = new Set(dismissedAchievementIds).add(current.id);
      setDismissedAchievementIds(dismissed);
      if (achievements.every((a) => dismissed.has(a.id))) onDone?.();
    }
  };

  return (
    <AchievementUnlockModal
      open={current !== null}
      onClose={handleClose}
      achievement={
        current
          ? {
              name: current.name,
              description: current.description,
              icon: current.icon,
              // Tier is normalised by tierStyle ("Gold" and "gold" both work)
              tier: current.tier,
              category: "",
              xpReward: current.xpReward,
            }
          : null
      }
    />
  );
}
