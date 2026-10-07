/**
 * The first-session quest's steps, the sensei's lines and the view the panel renders. No database
 * access, so the browser can import it; lib/quest.ts holds the rules that read and write progress.
 */

export const FIRST_SESSION = "first-session";

export type StepKey = "run-code" | "scratchpad" | "first-drill" | "fix-bug" | "progress";

export interface QuestStepDef {
  key: StepKey;
  title: string;
  /** What the sensei says while this is the current step */
  line: string;
  /** The `data-quest-target` the pointer looks for on the page */
  target: string;
  /** The pointer's short label beside the control */
  pointer: string;
  /** "browser": reported by POST /api/quest/event; "server": recorded with a drill pass */
  source: "browser" | "server";
}

export const STEPS: QuestStepDef[] = [
  {
    key: "run-code",
    title: "Run your first code",
    line: "Every lesson has code you can run. Press Run on the example and see what it does.",
    target: "run-example",
    pointer: "Press Run",
    source: "browser",
  },
  {
    key: "scratchpad",
    title: "Try the scratchpad",
    line: "The scratchpad is your own space to try ideas without leaving the lesson. Open it, change something and run it.",
    target: "scratchpad",
    pointer: "Your scratchpad",
    source: "browser",
  },
  {
    key: "first-drill",
    title: "Pass your first drill",
    line: "Drills are where you practise: read the task, write the code, press Run tests. If you get stuck, take a hint.",
    target: "run-tests",
    pointer: "Run the tests",
    source: "server",
  },
  {
    key: "fix-bug",
    title: "Fix your first bug",
    line: "Errors are part of training, not a sign you're failing. Read the message from the bottom up, then fix the code.",
    target: "run-tests",
    pointer: "Fix it, then run the tests",
    source: "server",
  },
  {
    key: "progress",
    title: "See your progress",
    line: "This is your record: your belt, its stripes and your streak. Train again tomorrow and the streak grows.",
    target: "belt",
    pointer: "Your record",
    source: "browser",
  },
];

/** Everything else the sensei says, kept with the step lines so the voice stays in one place */
export const SENSEI = {
  welcome: "Welcome to the mat. I'll show you how training works here: five short steps, about fifteen minutes.",
  /** Step 5 on the dashboard: the pointer moves through these in turn, then "Got it" */
  tour: [
    { target: "belt", pointer: "Your belt", line: "Your belt is your rank. Pass a module's checkpoint to earn a stripe; earn every stripe and the next belt is yours." },
    { target: "streak", pointer: "Your streak", line: "Your streak counts the days in a row you've trained. A few minutes a day keeps it going." },
    { target: "xp", pointer: "Your XP", line: "XP is the work you put in: every lesson and drill adds to it. Rank only comes from checkpoints." },
  ],
  skip: { title: "Skip the quest?", line: "You can pick it up again from your dashboard, and the steps you've done are kept." },
  offer: {
    title: "New: a 15-minute guided quest",
    line: "Five short steps with the sensei that show how lessons, drills and your record fit together. Anything you've already done is ticked off.",
  },
  resume: { title: "Resume your quest", line: (done: number) => `${done} of ${STEPS.length} steps done. Pick up where you left off.` },
  farewell: {
    title: "Ready to Train",
    line: "You ran code, tried your own idea, passed a drill and fixed a bug. That's the rhythm of every session here, and you're ready for it.",
  },
} as const;

export const BROWSER_STEPS = STEPS.filter((s) => s.source === "browser").map((s) => s.key);

/** Each path's fix-the-error drill in its first lesson (module 1's is a program drill, not a fix drill) */
export const BUG_DRILLS = { beginner: "start-fix-the-missing-quote", developer: "fix-the-indentation" } as const;

export type QuestPath = "beginner" | "developer";

export function questPath(experience: string | null | undefined): QuestPath {
  return experience === "new" ? "beginner" : "developer";
}

export function firstLessonSlug(path: QuestPath): string {
  return path === "beginner" ? "start-what-a-program-is" : "running-python";
}

export function currentStep(completed: readonly string[]): QuestStepDef | null {
  return STEPS.find((s) => !completed.includes(s.key)) ?? null;
}

export function isBugDrill(drill: { slug: string | null; type: string }): boolean {
  return drill.type === "fix" || (drill.slug !== null && Object.values(BUG_DRILLS).includes(drill.slug as never));
}

export interface QuestView {
  quest: string;
  path: QuestPath;
  completed: StepKey[];
  current: StepKey | null;
  /** Started, not finished, not skipped */
  active: boolean;
  finished: boolean;
  skipped: boolean;
  steps: Array<QuestStepDef & { done: boolean; href: string }>;
  /** Ready to Train's XP, once finished (for the farewell) */
  rewardXp: number | null;
}

/**
 * The dashboard's card: "offer" for a learner who never had the quest, "resume" for one skipped
 * midway, none otherwise (running, finished, or declined with "No thanks", a skip with no steps)
 */
export function questCard(view: QuestView | null): "offer" | "resume" | null {
  if (!view) return "offer";
  return view.skipped && view.completed.length > 0 ? "resume" : null;
}

/** The Ready to Train badge: the farewell celebrates it, so other screens don't toast it as well */
export const QUEST_BADGE = "ready-to-train";

/** In-page events. Components report what the learner did; only the quest panel talks to the API. */
export const QUEST_ACTION_EVENT = "pylearn:quest-action";
export const QUEST_REFRESH_EVENT = "pylearn:quest";

/** The learner did a browser step (the panel records it if the quest is active and it isn't done) */
export function questAction(step: StepKey): void {
  window.dispatchEvent(new CustomEvent(QUEST_ACTION_EVENT, { detail: { step } }));
}

/** Something the server records changed (a drill pass): the panel reloads */
export function questRefresh(): void {
  window.dispatchEvent(new Event(QUEST_REFRESH_EVENT));
}
