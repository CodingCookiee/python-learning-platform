"use client";

import { useEffect } from "react";
import { accountKey } from "@/lib/account-storage";

/**
 * Silent component that checks the streak once per browser session (a lapsed streak is reset; only
 * real practice grows it, so the ping never unlocks anything). It also tells the server the
 * browser's time zone, so the learner's days are their own. Renders null.
 */
export function StreakPing() {
  useEffect(() => {
    const SESSION_KEY = accountKey("streak_pinged");

    if (sessionStorage.getItem(SESSION_KEY)) {
      return; // Already pinged this session
    }

    async function ping() {
      try {
        const res = await fetch("/api/streak/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        });
        if (res.ok) sessionStorage.setItem(SESSION_KEY, "1");
      } catch (error) {
        console.error("[StreakPing] Failed to ping streak endpoint:", error);
      }
    }

    void ping();
  }, []);

  return null;
}
