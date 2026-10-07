"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, Crosshair, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AchievementNotificationQueue } from "@/components/gamification/achievement-notification";
import { Sensei } from "@/components/quest/sensei";
import { QuestPointer, showQuestTarget } from "@/components/quest/quest-pointer";
import { QuestFarewell } from "@/components/quest/quest-farewell";
import type { UnlockedAchievement } from "@/lib/achievements";
import {
  QUEST_ACTION_EVENT,
  QUEST_BADGE,
  QUEST_REFRESH_EVENT,
  questAction,
  SENSEI,
  STEPS,
  type QuestView,
  type StepKey,
} from "@/lib/quest-steps";
import { cn } from "@/lib/utils";

/** "open" or "min", per device: how the learner last left the panel */
const PANEL_KEY = "pylearn:quest-panel";
/** Exams and admin pages are no place for a guide */
const HIDDEN_ON = ["/admin", "/checkpoints", "/onboarding"];

function readPanel(): "open" | "min" | null {
  try {
    const v = localStorage.getItem(PANEL_KEY);
    return v === "open" || v === "min" ? v : null;
  } catch {
    return null;
  }
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function useMedia(query: string): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** The lesson scratchpad marks <html> while its pane is open (a bottom sheet below xl) */
function useScratchpadOpen(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scratchpad-open"] });
      return () => observer.disconnect();
    },
    () => document.documentElement.hasAttribute("data-scratchpad-open"),
    () => false
  );
}

async function post<T>(url: string, body?: unknown): Promise<T | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as T) : null;
}

const isEditor = (el: EventTarget | null) =>
  el instanceof Element && !el.closest("[data-quest-panel]") && !!el.closest(".monaco-editor, textarea, [contenteditable='true']");

/**
 * The first-session quest's guide, in the signed-in layout. It loads its own state on every page
 * change and on `pylearn:quest`, records browser steps from `pylearn:quest-action`, points at the
 * control the current step needs, and shows the farewell when the quest finishes. A card in the
 * corner on wide screens, a pill (and a sheet when opened) on phones; it gets out of the way while
 * the learner types or has the scratchpad open.
 */
export function QuestPanel() {
  const pathname = usePathname();
  const [view, setView] = React.useState<QuestView | null>(null);
  const viewRef = React.useRef<QuestView | null>(null);
  const [farewell, setFarewell] = React.useState<{ xp: number | null; lessonHref: string } | null>(null);
  const [unlocked, setUnlocked] = React.useState<UnlockedAchievement[]>([]);
  const [announcement, setAnnouncement] = React.useState("");
  const [cheer, setCheer] = React.useState(false);
  const [tour, setTour] = React.useState(0);
  const [confirmSkip, setConfirmSkip] = React.useState(false);
  const [presence, setPresence] = React.useState<{ key: string; present: boolean } | null>(null);

  const [chosen, setChosen] = React.useState<"open" | "min" | null>(null);
  const stored = React.useSyncExternalStore(subscribeStorage, readPanel, () => null);
  const wide = useMedia("(min-width: 48rem)");
  const xl = useMedia("(min-width: 80rem)");
  const scratchpadOpen = useScratchpadOpen();
  const [typingOn, setTypingOn] = React.useState<string | null>(null);
  // Opening the pill by hand while the scratchpad or typing has folded it keeps it open, for that
  // fold only (the page, the pane, the typing as they were), and until the learner types again
  const [heldFor, setHeldFor] = React.useState<string | null>(null);
  const pending = React.useRef(new Set<string>());
  const pillRef = React.useRef<HTMLButtonElement>(null);
  const cardRef = React.useRef<HTMLElement>(null);
  const focusAfter = React.useRef<"pill" | "card" | null>(null);

  const apply = React.useCallback((next: QuestView | null, achievements: UnlockedAchievement[] = []) => {
    const prev = viewRef.current;
    viewRef.current = next;
    setView(next);
    const others = achievements.filter((a) => a.slug !== QUEST_BADGE);
    if (others.length > 0) setUnlocked((list) => [...list, ...others]);
    if (!prev || !next || prev.quest !== next.quest) return;
    const fresh = STEPS.filter((s) => next.completed.includes(s.key) && !prev.completed.includes(s.key));
    const last = fresh.at(-1);
    if (last) {
      setAnnouncement(`Step ${STEPS.indexOf(last) + 1} of ${STEPS.length} done: ${last.title}`);
      setCheer(true);
      window.setTimeout(() => setCheer(false), 2400);
    }
    if (!prev.finished && next.finished) {
      setFarewell({ xp: next.rewardXp, lessonHref: next.steps[0]?.href ?? "/dashboard" });
    }
  }, []);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/quest", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    apply(((await res.json()) as { quest: QuestView | null }).quest);
  }, [apply]);

  // Every page change: the step may have been done elsewhere (a drill passed, another tab). A
  // finished or skipped quest stays put until something sends `pylearn:quest` (Resume, Start).
  React.useEffect(() => {
    if (viewRef.current?.finished || viewRef.current?.skipped) return;
    let current = true;
    fetch("/api/quest", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ quest: QuestView | null }>) : null))
      .then((data) => current && data && apply(data.quest))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [apply, pathname]);

  React.useEffect(() => {
    const onRefresh = () => void load();
    const onAction = (event: Event) => {
      const step = (event as CustomEvent<{ step?: StepKey }>).detail?.step;
      const current = viewRef.current;
      if (!step || !current?.active || current.completed.includes(step) || pending.current.has(step)) return;
      pending.current.add(step);
      void post<{ quest: QuestView | null; achievements: UnlockedAchievement[] }>("/api/quest/event", { step })
        .then((data) => data && apply(data.quest, data.achievements))
        .finally(() => pending.current.delete(step));
    };
    const onFocus = (event: FocusEvent) => {
      if (isEditor(event.target)) {
        setTypingOn(window.location.pathname);
        setHeldFor(null);
      } else if (event.target instanceof Element && !event.target.closest("[data-quest-panel]")) {
        setTypingOn(null);
      }
    };
    window.addEventListener(QUEST_REFRESH_EVENT, onRefresh);
    window.addEventListener(QUEST_ACTION_EVENT, onAction);
    document.addEventListener("focusin", onFocus);
    return () => {
      window.removeEventListener(QUEST_REFRESH_EVENT, onRefresh);
      window.removeEventListener(QUEST_ACTION_EVENT, onAction);
      document.removeEventListener("focusin", onFocus);
    };
  }, [load, apply]);

  const preference = chosen ?? stored;
  const typing = typingOn === pathname;
  const folding = typing || scratchpadOpen;
  const foldKey = `${pathname}|${typing}|${scratchpadOpen}`;
  const minimised = (preference ? preference === "min" : !wide) || (folding && heldFor !== foldKey);

  // Keep keyboard focus with the panel as it folds and unfolds
  React.useEffect(() => {
    const target = focusAfter.current === "pill" ? pillRef.current : focusAfter.current === "card" ? cardRef.current : null;
    focusAfter.current = null;
    target?.focus();
  }, [minimised]);

  function remember(next: "open" | "min") {
    setChosen(next);
    try {
      localStorage.setItem(PANEL_KEY, next);
    } catch {
      // Remembered for this page only
    }
  }
  function expand() {
    focusAfter.current = "card";
    setHeldFor(folding ? foldKey : null);
    remember("open");
  }
  function minimise() {
    focusAfter.current = "pill";
    setHeldFor(null);
    remember("min");
  }
  async function skip() {
    const data = await post<{ quest: QuestView | null }>("/api/quest/skip");
    if (data) apply(data.quest);
  }

  const live = (
    <p className="sr-only" aria-live="polite">
      {announcement}
    </p>
  );
  const extras = (
    <>
      {live}
      {unlocked.length > 0 && <AchievementNotificationQueue achievements={unlocked} />}
      {farewell && (
        <QuestFarewell
          open
          onOpenChange={(open) => !open && setFarewell(null)}
          xp={farewell.xp}
          lessonHref={farewell.lessonHref}
        />
      )}
    </>
  );

  const step = view?.steps.find((s) => s.key === view.current) ?? null;
  if (!view?.active || !step || HIDDEN_ON.some((p) => pathname.startsWith(p))) return extras;

  const total = STEPS.length;
  const position = STEPS.findIndex((s) => s.key === step.key) + 1;
  const touring = step.key === "progress" && pathname === "/dashboard";
  const stop = touring ? SENSEI.tour[Math.min(tour, SENSEI.tour.length - 1)]! : null;
  const target = stop?.target ?? step.target;
  // Where this step can be done right here: any lesson's examples and scratchpad, any drill for the
  // first pass, the path's own bug drill, and the dashboard's record
  const doableHere = touring || (step.key === "fix-bug" ? pathname === step.href : step.key !== "progress");
  const pointerKey = `${pathname}:${target}`;
  const present = doableHere && presence?.key === pointerKey && presence.present;
  const lines = stop ? [stop.line] : view.completed.length === 0 ? [SENSEI.welcome, step.line] : [step.line];
  const mood = cheer ? "pleased" : "calm";
  const lastStop = tour >= SENSEI.tour.length - 1;

  const pointer = doableHere && (
    <QuestPointer
      key={pointerKey}
      target={target}
      label={stop?.pointer ?? step.pointer}
      onPresence={(here) => setPresence({ key: pointerKey, present: here })}
    />
  );

  if (minimised) {
    return (
      <>
        {extras}
        {pointer}
        <button
          ref={pillRef}
          type="button"
          data-quest-panel
          onClick={expand}
          aria-label={`Open the quest: step ${position} of ${total}, ${step.title}`}
          className={cn(
            "fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-3.5 pl-1.5 text-sm font-semibold shadow-overlay transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            // Out of the scratchpad's way: above its bottom sheet, or beside its column on wide screens
            scratchpadOpen && (xl ? "right-auto left-4" : "top-20 bottom-auto")
          )}
        >
          <Sensei head mood={mood} />
          <span>
            Quest <span className="tabular">{position} of {total}</span>
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      {extras}
      {pointer}
      <section
        ref={cardRef}
        tabIndex={-1}
        data-quest-panel
        aria-label="Quest"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            minimise();
          }
        }}
        className={cn(
          "fixed inset-x-2 bottom-2 z-40 flex max-h-[min(36rem,calc(100dvh-6rem))] flex-col gap-3 overflow-y-auto rounded-md border border-border bg-card p-4 shadow-overlay outline-none md:inset-x-auto md:right-4 md:bottom-4 md:w-80",
          scratchpadOpen && !xl && "top-20 bottom-auto"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-primary">
            Quest · <span className="tabular">step {position} of {total}</span>
          </p>
          <Button variant="ghost" size="icon-xs" onClick={minimise} aria-label="Minimise the quest">
            <Minus aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-start gap-3">
          <Sensei mood={mood} className="h-18 w-16" />
          <div className="relative min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed">
            <span aria-hidden="true" className="absolute top-5 -left-[7px] size-3 rotate-45 border-b border-l border-border bg-background" />
            <p className="mb-1 font-semibold">{stop ? stop.pointer : step.title}</p>
            {lines.map((line) => (
              <p key={line} className="text-pretty [&+p]:mt-1.5">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {touring ? (
            <>
              <Button size="sm" variant="outline" onClick={() => showQuestTarget(target)} disabled={!present}>
                <Crosshair aria-hidden="true" />
                Show me
              </Button>
              {lastStop ? (
                <Button size="sm" onClick={() => questAction("progress")}>
                  <Check aria-hidden="true" />
                  Got it
                </Button>
              ) : (
                <Button size="sm" onClick={() => setTour((t) => t + 1)}>
                  Next
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Button>
              )}
            </>
          ) : present ? (
            <Button size="sm" onClick={() => showQuestTarget(target)}>
              <Crosshair aria-hidden="true" />
              Show me
            </Button>
          ) : pathname !== step.href ? (
            <Button size="sm" asChild>
              <Link href={step.href}>
                Go there
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>

        <ol className="flex flex-col gap-1.5 text-sm">
          {view.steps.map((s, i) => {
            const current = s.key === step.key;
            return (
              <li key={s.key} aria-current={current ? "step" : undefined} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center border text-[0.6875rem] font-bold tabular",
                    s.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : current
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                  )}
                >
                  {s.done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={cn(s.done && "text-muted-foreground", current && "font-semibold")}>{s.title}</span>
                {s.done && <span className="sr-only">(done)</span>}
              </li>
            );
          })}
        </ol>

        <Progress value={(view.completed.length / total) * 100} aria-label={`${view.completed.length} of ${total} steps done`} />

        <button
          type="button"
          onClick={() => setConfirmSkip(true)}
          className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Skip the quest
        </button>
      </section>

      <AlertDialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{SENSEI.skip.title}</AlertDialogTitle>
            <AlertDialogDescription>{SENSEI.skip.line}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => void skip()}>Skip the quest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
