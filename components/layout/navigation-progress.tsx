"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START = "pylearn:navigate";
/** Give up on a navigation that never lands (a cancelled push), so the bar can't hang on */
const GIVE_UP_MS = 15_000;

/** Show the bar for a move that doesn't start with a link click (router.push, signing out) */
export function startNavigation(): void {
  window.dispatchEvent(new Event(START));
}

// Set by a link's own click handler when it holds the move back (see holdNavigation)
let held = false;
/**
 * Call from a link's click handler that holds the move back (a drill saving first): this click
 * doesn't start the bar, and the handler calls `startNavigation` when it does move on. (Every Next
 * link prevents the click's default to route it itself, so that can't be the signal.)
 */
export function holdNavigation(): void {
  held = true;
  // A click that never reaches the bar's listener mustn't hold the next one
  window.setTimeout(() => {
    held = false;
  });
}

/** An ordinary left click on a link to another page of this site: the start of a navigation */
function isPageLink(event: MouseEvent): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return false;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  // The same page (or only its #hash) isn't a page load
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

/**
 * A thin jade bar across the top while the next page loads: every page renders on the server, so a
 * click can otherwise look dead for a second or two. It starts on a link click (or `startNavigation`)
 * and is gone once the URL changes; it only shows if the wait passes a moment, so quick pages don't
 * flash it.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const here = `${pathname}?${search.toString()}`;
  // The page a navigation started from: the bar shows while we're still on it
  const [from, setFrom] = React.useState<{ url: string; at: number } | null>(null);
  const [now, setNow] = React.useState(0);
  // The page arrived: that navigation is over (so going Back to where it started doesn't bring the bar back)
  const [arrived, setArrived] = React.useState(here);
  if (arrived !== here) {
    setArrived(here);
    setFrom(null);
  }

  React.useEffect(() => {
    const start = () => setFrom({ url: `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`, at: Date.now() });
    const onClick = (event: MouseEvent) => {
      const wasHeld = held;
      held = false;
      if (!wasHeld && isPageLink(event)) start();
    };
    // Bubble phase, after React's own listener: a link's handler has had its chance to hold the move
    document.addEventListener("click", onClick);
    window.addEventListener(START, start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(START, start);
    };
  }, []);

  // A slow clock, only to let a stuck bar give up
  React.useEffect(() => {
    if (!from) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [from]);

  const loading = from !== null && from.url === here && (now === 0 || now - from.at < GIVE_UP_MS);
  if (!loading) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading the page"
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5 overflow-hidden bg-primary/20 opacity-0 animate-[nav-appear_200ms_150ms_forwards]"
    >
      <div className="h-full w-1/3 bg-primary motion-safe:animate-[nav-progress_1.1s_ease-in-out_infinite] motion-reduce:w-full" />
    </div>
  );
}
