"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** How long a linked section may take to stream in before we stop waiting for it (a slow database) */
const WAIT_MS = 30_000;
/** After landing, how long to keep it there if the router's own scroll-to-top runs late */
const HOLD_MS = 1_500;

/**
 * Lands a link to a section of another page (/modules/x#checkpoint-heading) on that section. The app's
 * pages stream in behind a loading screen, so when the browser looks for the #id it isn't there yet
 * and the page opens at the top. After each navigation this waits for the target to appear, scrolls to
 * it, and for a moment puts it back if the router's scroll-to-top lands after it, until the reader
 * scrolls or types themselves. Renders nothing.
 */
export function HashScroll() {
  const pathname = usePathname();

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    let observer: MutationObserver | null = null;
    let touched = false;
    const onTouch = () => {
      touched = true;
    };
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const)
      window.addEventListener(type, onTouch, { passive: true });

    const target = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      return id ? document.getElementById(id) : null;
    };
    const offScreen = (el: HTMLElement) => {
      const top = el.getBoundingClientRect().top;
      return top < 0 || top > window.innerHeight * 0.6;
    };
    const land = () => {
      const el = target();
      if (!el) return false;
      el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      // The router may still scroll the new page to its top: put the section back if it does
      for (const ms of [250, 700, HOLD_MS]) {
        timers.push(
          window.setTimeout(() => {
            const again = target();
            if (!touched && again && offScreen(again)) again.scrollIntoView({ block: "start", behavior: "auto" });
          }, ms)
        );
      }
      return true;
    };

    // The hash can follow the path by a tick on a client navigation: look once it has settled
    timers.push(
      window.setTimeout(() => {
        if (!window.location.hash || land()) return;
        observer = new MutationObserver(() => {
          if (land()) observer?.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        timers.push(window.setTimeout(() => observer?.disconnect(), WAIT_MS));
      }, 0)
    );

    return () => {
      observer?.disconnect();
      for (const t of timers) window.clearTimeout(t);
      for (const type of ["wheel", "touchstart", "keydown", "pointerdown"] as const)
        window.removeEventListener(type, onTouch);
    };
  }, [pathname]);

  return null;
}
