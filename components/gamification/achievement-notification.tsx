"use client";

import * as React from "react";
import { AchievementUnlockModal } from "./achievement-unlock-modal";
import type { UnlockedAchievement } from "@/lib/achievements";

export interface AchievementNotificationQueueProps {
  achievements: UnlockedAchievement[];
}

export function AchievementNotificationQueue({ achievements }: AchievementNotificationQueueProps) {
  const [dismissedAchievementIds, setDismissedAchievementIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const current =
    achievements.find((achievement) => !dismissedAchievementIds.has(achievement.id)) ?? null;

  const handleClose = () => {
    if (current) {
      setDismissedAchievementIds((prev) => new Set(prev).add(current.id));
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
