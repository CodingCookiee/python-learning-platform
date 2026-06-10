"use client";

import * as React from "react";
import { MilestoneCelebration } from "./milestone-celebration";

const MILESTONES = [25, 50, 75, 100] as const;
type Milestone = (typeof MILESTONES)[number];

export interface MilestoneTrackerProps {
  /** Current overall completion percentage (0-100) */
  overallPercentage: number;
}

/**
 * Silently checks whether the user just crossed a milestone.
 * Uses sessionStorage to ensure each milestone celebration shows only once per session.
 */
export function MilestoneTracker({ overallPercentage }: MilestoneTrackerProps) {
  const [activeMilestone, setActiveMilestone] = React.useState<Milestone | null>(() => {
    if (typeof window === "undefined") return null;
    for (const m of [...MILESTONES].reverse()) {
      if (overallPercentage >= m) {
        const key = `milestone_seen_${m}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          return m;
        }
        break; // only show the highest unseen milestone
      }
    }
    return null;
  });

  if (!activeMilestone) return null;

  return (
    <MilestoneCelebration percentage={activeMilestone} onDismiss={() => setActiveMilestone(null)} />
  );
}
