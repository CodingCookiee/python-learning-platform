"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** How long a linked section may take to stream in before we stop waiting for it */
const WAIT_MS = 10_000;

/**
 * Lands a link to a section of another page (/modules/x#checkpoint-heading) on that section. The app's
 * pages stream in behind a loading screen, so when the browser looks for the #id it isn't there yet
 * and the page opens at the top. After each navigation this waits for the target to appear, then
 * scrolls to it once. Renders nothing.
 */
export function HashScroll() {
  const pathname = usePathname();

  React.useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let observer: MutationObserver | null = null;
    const land = () => {
      const target = document.getElementById(id);
      if (!target) return false;
      target.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      return true;
    };
    if (land()) return;
    observer = new MutationObserver(() => {
      if (land()) observer?.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const giveUp = window.setTimeout(() => observer?.disconnect(), WAIT_MS);
    return () => {
      observer?.disconnect();
      window.clearTimeout(giveUp);
    };
  }, [pathname]);

  return null;
}
