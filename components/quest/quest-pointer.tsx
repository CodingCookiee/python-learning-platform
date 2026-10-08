"use client";

import * as React from "react";

/** Below the sticky navbar (h-16): a control scrolled under it isn't pointed at */
const NAV = 64;

function visible(el: Element): DOMRect | null {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect : null;
}

/** The marked controls for a target, in page order, that are rendered (not display: none) */
export function questTargets(target: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-quest-target="${target}"]`)).filter((el) => visible(el));
}

/** Scroll the first marked control into view and focus it (the panel's "Show me") */
export function showQuestTarget(target: string): boolean {
  const el = questTargets(target)[0];
  if (!el) return false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  el.focus({ preventScroll: true });
  return true;
}

interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The first marked control on screen, if any */
function onScreen(target: string): Spot | null {
  for (const el of questTargets(target)) {
    const rect = visible(el);
    if (rect && rect.bottom > NAV && rect.top < window.innerHeight) {
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
    }
  }
  return null;
}

const same = (a: Spot | null, b: Spot | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/**
 * A pulsing ring and a short label around the control the current step needs. It follows the
 * control as the page scrolls or reflows, and hides while the control is off screen. It never
 * takes clicks or focus, and it's hidden from assistive tech: the panel's words carry the step.
 * `onPresence` reports whether the control exists on this page at all (on screen or not).
 */
export function QuestPointer({
  target,
  label,
  onPresence,
}: {
  target: string;
  label: string;
  onPresence?: (present: boolean) => void;
}) {
  const [spot, setSpot] = React.useState<Spot | null>(null);
  const presenceRef = React.useRef(onPresence);
  React.useEffect(() => {
    presenceRef.current = onPresence;
  }, [onPresence]);

  React.useEffect(() => {
    let frame = 0;
    let last: Spot | null = null;
    let present: boolean | null = null;
    const measure = () => {
      frame = 0;
      const next = onScreen(target);
      if (!same(next, last)) {
        last = next;
        setSpot(next);
      }
      const here = questTargets(target).length > 0;
      if (here !== present) {
        present = here;
        presenceRef.current?.(here);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    // Controls come and go without a scroll: the scratchpad opening, a page streaming in
    const poll = window.setInterval(schedule, 400);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      window.clearInterval(poll);
    };
  }, [target]);

  if (!spot) return null;
  const pad = 4;
  // The label sits above the control, or below it when that would run under the navbar
  const above = spot.top - 30 > NAV;
  const alignRight = spot.left + spot.width / 2 > window.innerWidth / 2;
  // Layer 41: above the page, the sticky navbar and the phone scratchpad pane (40), under the quest
  // panel (42), so a ring around a wide target never draws across the panel
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <div
        className="fixed z-41 rounded-md border-2 border-primary motion-safe:animate-quest-pulse"
        style={{ top: spot.top - pad, left: spot.left - pad, width: spot.width + pad * 2, height: spot.height + pad * 2 }}
      />
      <span
        className="fixed z-41 max-w-56 rounded-sm bg-primary px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-sm"
        style={{
          top: above ? spot.top - pad - 26 : spot.top + spot.height + pad + 6,
          ...(alignRight
            ? { right: Math.max(8, window.innerWidth - (spot.left + spot.width + pad)) }
            : { left: Math.max(8, spot.left - pad) }),
        }}
      >
        {label}
      </span>
    </div>
  );
}
