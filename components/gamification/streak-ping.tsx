"use client";

import { useEffect } from "react";

interface PingResponse {
  currentStreak: number;
  longestStreak: number;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: string;
    xpReward: number;
  }>;
}

/**
 * Silent component that records a streak ping once per browser session.
 * Renders null -- purely a side-effect component.
 */
export function StreakPing() {
  useEffect(() => {
    const SESSION_KEY = "streak_pinged";

    if (sessionStorage.getItem(SESSION_KEY)) {
      return; // Already pinged this session
    }

    async function ping() {
      try {
        const res = await fetch("/api/streak/ping", { method: "POST" });
        if (!res.ok) return;

        const data: PingResponse = await res.json();
        sessionStorage.setItem(SESSION_KEY, "1");

        if (data.achievements.length > 0) {
          console.log("[StreakPing] New achievements unlocked:", data.achievements);
        }
      } catch (error) {
        console.error("[StreakPing] Failed to ping streak endpoint:", error);
      }
    }

    void ping();
  }, []);

  return null;
}
