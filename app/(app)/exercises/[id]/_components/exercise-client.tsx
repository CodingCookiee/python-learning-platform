"use client";

import { Spinner } from "@/components/brand/knot-loader";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { holdNavigation, startNavigation } from "@/components/layout/navigation-progress";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Lock,
  Play,
  Repeat,
  RotateCcw,
  TerminalSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingLine } from "@/components/ui/pending-line";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LessonContent, PythonEditor, languageFor } from "@/components/lesson";
import { TapeMark, SenseiMark, SheetMark } from "@/components/brand/marks";
import { Seal } from "@/components/brand/seal";
import {
  AchievementNotificationQueue,
  Confetti,
  LevelUpNotification,
} from "@/components/gamification";
import {
  getPythonRuntime,
  useRuntimeStatus,
  type PyError,
  type RunResult,
  type TestRunResult,
} from "@/lib/python-runtime";
import type { UnlockedAchievement } from "@/lib/achievements";
import { QUEST_BADGE, questBug, questRefresh } from "@/lib/quest-steps";
import { WHITE_BELT_TIED, WhiteBeltCeremony } from "@/components/onramp/white-belt-ceremony";
import { ClockAnnouncement, HandInButton } from "@/components/mastery/checkpoint-controls";
import type { DrillData, DrillMode, DrillType } from "@/lib/drills";
import { cn } from "@/lib/utils";
import { TutorPanel, type TutorHandle } from "@/components/tutor/tutor-panel";
import type { SavedKey } from "@/lib/ai/models";
import { combinedSource } from "@/lib/drill-files";

// Copy per drill type

const TYPE_LABEL: Record<DrillType, string> = {
  function: "Write the code",
  program: "Write a program",
  predict: "Predict the output",
  fix: "Fix the bug",
  refactor: "Refactor",
  tests: "Write the tests",
};

// Helpers

/** Compare printed output the way a person would: ignore trailing spaces and blank lines at the end */
function normaliseOutput(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}

function firstDifferentLine(expected: string, actual: string): number | null {
  const a = normaliseOutput(expected).split("\n");
  const b = normaliseOutput(actual).split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return i + 1;
  return null;
}

type CheckState =
  | { kind: "idle" }
  | { kind: "tests"; result: TestRunResult }
  | {
      kind: "predict";
      correct: boolean;
      wrongLine: number | null;
      actual: string;
      error: PyError | null;
    };

// Error box: a traceback trimmed to the learner's own code

/** Explain a traceback with the tutor; absent when the tutor isn't available */
type Explain = ((error: PyError) => void) | null;

function errorText(error: PyError): string {
  return [
    `${error.type}: ${error.message}`,
    error.line ? `(line ${error.line})` : "",
    error.traceback ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

function ErrorBox({
  error,
  title,
  onExplain,
}: {
  error: PyError;
  title?: string;
  onExplain?: Explain;
}) {
  const heading =
    title ??
    (error.type === "Timeout"
      ? "Timed out"
      : error.line
        ? `${error.type} on line ${error.line}`
        : error.type);
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/8 p-4">
      <p className="text-sm font-semibold text-destructive">{heading}</p>
      <p className="mt-1 text-sm text-foreground">{error.message}</p>
      {error.traceback && error.type !== "Timeout" && (
        <pre className="mt-3 overflow-x-auto font-mono text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
          {error.traceback}
        </pre>
      )}
      {onExplain && error.type !== "Timeout" && (
        <Button variant="outline" size="sm" className="mt-3" onClick={() => onExplain(error)}>
          Explain this error
        </Button>
      )}
    </div>
  );
}

// Prompt panel: the task, the test list, hints

function TestList({ drill, check }: { drill: DrillData; check: CheckState }) {
  const headingId = React.useId();
  const results = check.kind === "tests" ? check.result.tests : null;
  const rows =
    results && results.length > 0
      ? results.map((r) => ({ name: r.name, hidden: r.hidden, passed: r.passed as boolean | null }))
      : drill.testList.map((t) => ({ ...t, passed: null as boolean | null }));
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2 flex items-baseline gap-2 text-base font-semibold">
        Tests
        <span className="font-condensed tabular text-sm font-normal text-muted-foreground">
          {rows.length}
        </span>
      </h2>
      <ul className="flex flex-col border-t border-border" role="list">
        {rows.map((row, i) => (
          <li
            key={`${row.name}-${i}`}
            className="flex items-start gap-2.5 border-b border-border py-2.5 text-sm"
          >
            <span
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              {row.passed === true ? (
                <Check className="size-4 text-success" />
              ) : row.passed === false ? (
                <X className="size-4 text-destructive" />
              ) : (
                // Not run yet: a hairline, not a box (a box reads as a checkbox to tick)
                <span className="h-px w-2.5 bg-(--keyline)/55" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              {row.name}
              {row.hidden && <span className="ml-2 text-xs text-muted-foreground">hidden</span>}
            </span>
            <span className="sr-only">
              {row.passed === true ? "passed" : row.passed === false ? "failed" : "not run yet"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Hints({ hints, used, onReveal }: { hints: string[]; used: number; onReveal: () => void }) {
  const headingId = React.useId();
  if (hints.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="rounded-md border border-border bg-sheet p-4">
      <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold">
        <SenseiMark className="size-4" />
        Hints
      </h2>
      {used > 0 && (
        <ol className="mt-3 flex flex-col gap-2.5" role="list">
          {hints.slice(0, used).map((hint, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="font-condensed tabular font-bold text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0">
                <LessonContent
                  content={hint}
                  runnable={false}
                  className="[&_p]:mb-0 [&_p]:text-sm"
                />
              </span>
            </li>
          ))}
        </ol>
      )}
      {used < hints.length ? (
        <Button variant="outline" size="sm" onClick={onReveal} className="mt-3">
          {used === 0 ? "Show a hint" : `Show hint ${used + 1} of ${hints.length}`}
        </Button>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">That’s every hint.</p>
      )}
    </section>
  );
}

// Checkpoint and review banners

function useCountdown(deadline: string | null): number | null {
  const [left, setLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return left;
}

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function ModeBanner({
  mode,
  progress,
  closed,
}: {
  mode: DrillMode;
  progress: { passedCount: number; total: number } | null;
  /** The checkpoint closed during this visit (every drill passed): the pass strip says so */
  closed: boolean;
}) {
  const left = useCountdown(mode.kind === "checkpoint" ? mode.deadline : null);
  if (mode.kind === "practice") return null;
  if (mode.kind === "review") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-border bg-accent/45 px-4 py-3 text-sm">
        <Repeat className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          <span className="font-semibold">Review.</span>{" "}
          {mode.due
            ? "Solve it from memory. A clean pass pushes the next review further out; hints bring it back tomorrow."
            : "This one isn't due yet, so this attempt is practice and won't change its schedule."}
        </p>
      </div>
    );
  }
  const done = progress ?? { passedCount: mode.passedCount, total: mode.total };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-primary/30 bg-primary/6 px-4 py-3 text-sm">
      <span className="font-semibold">Grading</span>
      <span className="font-condensed tabular text-muted-foreground">
        {done.passedCount} of {done.total} passed
      </span>
      <span
        className={cn(
          "font-condensed tabular ml-auto flex items-center gap-1.5",
          left !== null && left < 5 * 60_000
            ? "font-bold text-destructive"
            : "text-muted-foreground"
        )}
      >
        <Clock className="size-3.5" aria-hidden="true" />
        {left === null ? "…" : left === 0 ? "Time’s up" : `${formatClock(left)} left`}
        <ClockAnnouncement left={left} />
      </span>
      <p className="basis-full text-muted-foreground">
        No hints, no reference solution, and no copy and paste: type your answer. Run the tests as
        often as you like.
      </p>
      {/* Done before the clock is: hand in from here, without going back to the checkpoint page */}
      {!closed && left !== 0 && (
        <div className="mt-2 basis-full">
          <HandInButton
            attemptId={mode.attemptId}
            allPassed={done.passedCount === done.total}
            href={`/checkpoints/${mode.attemptId}`}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Checkpoints lock the clipboard (the drill can't be copied out, nor an answer pasted in); this says
 * so where the learner tried. Mounted from the start so screen readers hear it when it appears.
 */
function ClipboardNote({ shown }: { shown: boolean }) {
  return (
    <p
      role="status"
      className={cn("flex items-center gap-2 text-sm text-muted-foreground", !shown && "sr-only")}
    >
      {shown && (
        <>
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          Copy and paste are off in gradings. Type your answer.
        </>
      )}
    </p>
  );
}

/** Stop a clipboard event on a locked element, and say why */
const blockClipboard = (onBlocked: () => void) => (event: React.SyntheticEvent) => {
  event.preventDefault();
  onBlocked();
};

function PromptPanel({
  drill,
  check,
  hintsUsed,
  onRevealHint,
  progress,
  checkpointClosed,
  clipboardNote,
  onClipboardBlocked,
}: {
  drill: DrillData;
  check: CheckState;
  hintsUsed: number;
  onRevealHint: () => void;
  progress: { passedCount: number; total: number } | null;
  /** The checkpoint closed during this visit */
  checkpointClosed: boolean;
  /** A copy was stopped here: say why */
  clipboardNote: boolean;
  onClipboardBlocked: () => void;
}) {
  const inCheckpoint = drill.mode.kind === "checkpoint";
  // Checkpoints: the task can't be selected or copied out (to paste into another tool)
  const lock = inCheckpoint
    ? { onCopy: blockClipboard(onClipboardBlocked), onCut: blockClipboard(onClipboardBlocked) }
    : {};
  return (
    <div className={cn("flex flex-col gap-6", inCheckpoint && "select-none")} {...lock}>
      <ModeBanner mode={drill.mode} progress={progress} closed={checkpointClosed} />
      {inCheckpoint && <ClipboardNote shown={clipboardNote} />}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            {TYPE_LABEL[drill.type]}
          </Badge>
          <Badge
            variant="outline"
            className="text-muted-foreground"
            aria-label={`Difficulty: ${drill.difficulty}`}
          >
            {drill.difficulty}
          </Badge>
          <Badge variant="outline" className="font-condensed tabular gap-1 text-muted-foreground">
            <TapeMark className="size-3.5" />
            {drill.xpReward} XP
          </Badge>
          {!drill.required && (
            <Badge variant="outline" className="text-muted-foreground">
              Optional
            </Badge>
          )}
        </div>
        <h1 className="font-condensed text-4xl leading-[0.98] font-extrabold tracking-[-0.02em]">
          {drill.title}
        </h1>
        {drill.position.total > 1 && drill.mode.kind !== "review" && (
          <p className="font-condensed tabular text-sm text-muted-foreground">
            Drill {drill.position.index + 1} of {drill.position.total}{" "}
            {inCheckpoint ? "in the grading" : `in ${drill.lesson.title}`}
          </p>
        )}
        {drill.mode.kind === "review" && (
          <p className="text-sm text-muted-foreground">
            From {drill.lesson.title}, {drill.module.title}
          </p>
        )}
      </div>

      <LessonContent
        content={drill.instructions}
        runnable={false}
        copyable={!inCheckpoint}
        className="[&_p]:text-base"
      />
      {drill.type !== "predict" && <TestList drill={drill} check={check} />}
      <Hints hints={drill.hints} used={hintsUsed} onReveal={onRevealHint} />
    </div>
  );
}

// Results

function TestResults({ result, onExplain }: { result: TestRunResult; onExplain?: Explain }) {
  const [open, setOpen] = React.useState<number | null>(null);
  if (result.status === "timeout" || (result.status === "error" && result.error)) {
    const title =
      result.status === "timeout"
        ? "Timed out"
        : result.phase === "tests"
          ? "The drill's tests couldn't run"
          : undefined;
    return (
      <div className="flex flex-col gap-3">
        <ErrorBox
          error={result.error!}
          title={title}
          onExplain={result.phase === "tests" ? null : onExplain}
        />
        {result.stdout && <PrintedOutput text={result.stdout} />}
      </div>
    );
  }
  const passed = result.tests.filter((t) => t.passed).length;
  const total = result.tests.length;
  const all = passed === total;
  // Every test passed: one line here (the pass strip below celebrates it, and the task's test list
  // ticks each one); the rows stay a click away
  if (all && open === null) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-success/35 bg-success/6 px-4 py-3">
        <p className="font-condensed tabular text-lg font-bold text-success-ink">
          All {total} {total === 1 ? "test" : "tests"} passed
        </p>
        <button
          type="button"
          onClick={() => setOpen(-1)}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Show tests
        </button>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-md border p-4",
        all ? "border-success/35 bg-success/6" : "border-border bg-sheet"
      )}
    >
      <p
        className={cn(
          "font-condensed tabular text-lg font-bold",
          all ? "text-success-ink" : "text-foreground"
        )}
      >
        {passed} of {total} tests passed
      </p>
      <ul className="mt-2 flex flex-col" role="list">
        {result.tests.map((t, i) => {
          const hasDetail = Boolean(t.stdout || t.error?.traceback);
          return (
            <li key={`${t.name}-${i}`} className="border-t border-border/70 py-2 first:border-t-0">
              <div className="flex items-start gap-2 text-sm">
                {t.passed ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Passed" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Failed" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn(!t.passed && "font-medium")}>
                    {t.name}
                    {t.hidden && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">hidden</span>
                    )}
                  </p>
                  {t.message && (
                    <p className="mt-0.5 font-mono text-[0.8125rem] leading-5 wrap-break-word whitespace-pre-wrap text-foreground/85">
                      {t.message}
                    </p>
                  )}
                </div>
                {hasDetail && (
                  <button
                    type="button"
                    onClick={() => setOpen(open === i ? null : i)}
                    aria-expanded={open === i}
                    className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Details
                    <ChevronDown
                      className={cn("size-3.5 transition-transform", open === i && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
              {open === i && (
                <div className="mt-2 ml-6 flex flex-col gap-2">
                  {t.stdout && <PrintedOutput text={t.stdout} />}
                  {t.error?.traceback && (
                    <pre className="overflow-x-auto rounded-sm bg-destructive/8 p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
                      {t.error.traceback}
                    </pre>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PrintedOutput({ text, label = "Printed" }: { text: string; label?: string }) {
  return (
    <div className="rounded-md border border-border bg-sheet">
      <p className="border-b border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted-foreground">
        {label}
      </p>
      <pre className="max-h-72 overflow-auto px-3 py-2 font-mono text-[0.8125rem] leading-6 whitespace-pre-wrap">
        {text.trimEnd() || <span className="text-muted-foreground">(nothing)</span>}
      </pre>
    </div>
  );
}

/** The functions a piece of code defines at the top level, in order */
function definedFunctions(code: string): string[] {
  return [...code.matchAll(/^def\s+([A-Za-z_]\w*)\s*\(/gm)].map((m) => m[1]!);
}

/**
 * Run printed nothing because the code only defines functions (most drills ask for one): say so, and
 * show how to see a result, rather than an empty box that reads as "Run is broken"
 */
function NothingPrinted({ functions }: { functions: string[] }) {
  const name = functions[0]!;
  return (
    <div className="rounded-md border border-border bg-sheet px-4 py-3 text-sm leading-relaxed">
      <p className="font-semibold">It ran, and printed nothing.</p>
      <p className="mt-1 text-muted-foreground">
        Your code defines <code className="font-mono text-foreground">{name}()</code>
        {functions.length > 1 ? ` and ${functions.length - 1} more` : ""}, and defining a function
        doesn&apos;t run it. To see what it gives back, add a line below it that calls it and prints
        the result, with values of your own:
      </p>
      <pre className="mt-2 font-mono text-[0.8125rem] text-foreground">print({name}(…))</pre>
      <p className="mt-2 text-muted-foreground">
        Run tests checks it against the drill&apos;s cases either way.
      </p>
    </div>
  );
}

function RunOutput({
  result,
  code,
  onExplain,
}: {
  result: RunResult;
  code: string;
  onExplain?: Explain;
}) {
  const functions = definedFunctions(code);
  if (!result.error && !result.stdout.trim() && !result.stderr && functions.length > 0) {
    return <NothingPrinted functions={functions} />;
  }
  return (
    <div className="flex flex-col gap-3">
      {(result.stdout || !result.error) && <PrintedOutput text={result.stdout} label="Output" />}
      {result.stderr && <PrintedOutput text={result.stderr} label="Warnings" />}
      {result.error && <ErrorBox error={result.error} onExplain={onExplain} />}
    </div>
  );
}

// Workspace

interface SubmitResponse {
  mode: DrillMode["kind"];
  grading: "client" | "server";
  gradingDisagreed: boolean;
  submission: { attempts: number; passed: boolean };
  xpGained: number;
  newlySolved: boolean;
  achievements: UnlockedAchievement[];
  levelUp?: boolean;
  newLevel?: number;
  solution?: string | null;
  solutionFiles?: Record<string, string> | null;
  review: { counted: boolean; stage: number; nextDueAt: string | null } | null;
  checkpoint:
    | { passedCount: number; total: number; finished: { score: number; passed: boolean } | null }
    | { error: string }
    | null;
  /** This pass was the lesson's last required drill: the lesson is now complete */
  lesson?: LessonDone | null;
}

interface LessonDone {
  xpGained: number;
  next: { id: string; title: string } | null;
  moduleId: string;
  /** On-ramp lessons: where the white belt ceremony sends the learner, and the on-ramp's size */
  onRamp: { nextHref: string; lessons: number } | null;
}

const EDITOR_KEY: Record<DrillMode["kind"], (drill: DrillData) => string> = {
  practice: (d) => `drill-${d.id}`,
  // Each review starts from a blank starter, not last time's answer
  review: (d) => `review-${d.id}-${d.mode.kind === "review" ? d.mode.reviews : 0}`,
  checkpoint: (d) => `checkpoint-${d.mode.kind === "checkpoint" ? d.mode.attemptId : ""}-${d.id}`,
};

function daysUntil(iso: string): number {
  return Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/** A plain-text account of the latest run, for the tutor */
function describeCheck(
  check: CheckState,
  run: RunResult | null,
  answer: string
): string | undefined {
  const parts: string[] = [];
  if (check.kind === "tests") {
    const r = check.result;
    if (r.status === "timeout") parts.push("The test run timed out.");
    else if (r.status === "error" && r.error)
      parts.push(`The tests couldn't run: ${errorText(r.error)}`);
    else {
      const passed = r.tests.filter((t) => t.passed).length;
      parts.push(`${passed} of ${r.tests.length} tests passed.`);
      for (const t of r.tests.filter((t) => !t.passed))
        parts.push(`FAILED ${t.name}${t.message ? `: ${t.message}` : ""}`);
    }
  } else if (check.kind === "predict") {
    parts.push(
      `My predicted output:\n${answer}\n\nThat was ${check.correct ? "correct" : "not correct"}.`
    );
  }
  if (run) {
    parts.push(`Output of my last Run:\n${run.stdout || "(nothing printed)"}`);
    if (run.error) parts.push(errorText(run.error));
  }
  return parts.length ? parts.join("\n") : undefined;
}

/** An error as one spoken sentence: its type, where, and what it says (no traceback) */
function spokenError(error: PyError): string {
  return `${error.type}${error.line ? ` on line ${error.line}` : ""}: ${error.message}`;
}

/**
 * What a screen reader hears when a test run finishes: the outcome in a sentence, with the failing
 * tests named. The results themselves stay on the page to read in full; they aren't a live region, so
 * the outcome is said once rather than as the whole block of rows and messages.
 */
function spokenTests(result: TestRunResult): string {
  if (result.status === "timeout") return "The tests timed out.";
  if (result.status === "error" && result.error) {
    return result.phase === "tests"
      ? "The drill's tests couldn't run."
      : `Your code raised an error. ${spokenError(result.error)}`;
  }
  const failed = result.tests.filter((t) => !t.passed);
  if (failed.length === 0)
    return `All ${result.tests.length} ${result.tests.length === 1 ? "test" : "tests"} passed.`;
  return `${result.tests.length - failed.length} of ${result.tests.length} tests passed. Failed: ${failed.map((t) => t.name).join("; ")}.`;
}

function spokenRun(result: RunResult, functions: string[] = []): string {
  if (result.error) return `Ran, with an error. ${spokenError(result.error)}`;
  if (result.stdout.trim()) return "Ran. The output is below the buttons.";
  return functions.length > 0
    ? `Ran, and printed nothing: your code defines ${functions[0]}, and defining a function doesn't run it. Add a line that prints a call to it to see its result.`
    : "Ran. It printed nothing.";
}

/**
 * A link away from the drill that waits for a saving pass: pressed during the save it says "Saving…"
 * and goes once the save lands (and anything it unlocked has been seen). One width in both states.
 */
function WaitLink({
  href,
  pending,
  onClick,
  variant,
  children,
}: {
  href: string;
  pending: string | null;
  onClick: (href: string) => (event: React.MouseEvent) => void;
  variant?: "default" | "outline";
  children: React.ReactNode;
}) {
  const waiting = pending === href;
  return (
    <Button asChild variant={variant}>
      <Link href={href} onClick={onClick(href)} aria-busy={waiting || undefined}>
        {waiting && <Spinner />}
        <span className="grid justify-items-center">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-1.5",
              waiting && "invisible"
            )}
          >
            {children}
          </span>
          <span className={cn("col-start-1 row-start-1", !waiting && "invisible")}>Saving…</span>
        </span>
      </Link>
    </Button>
  );
}

export function ExerciseClient({
  drill,
  aiKeys,
  serverGrading = false,
}: {
  drill: DrillData;
  /** The learner's AI keys, for the tutor and its model switcher; empty without one */
  aiKeys: SavedKey[];
  /** GRADING_MODE=server: a save re-runs the tests on the server, which the save's progress says */
  serverGrading?: boolean;
}) {
  // Phones show the task or the code; wide screens show both
  const [mobilePane, setMobilePane] = React.useState<"task" | "code">("task");
  const { status: runtimeStatus, text: runtimeText } = useRuntimeStatus();
  const isPredict = drill.type === "predict";
  const mode = drill.mode;
  const exam = mode.kind !== "practice";

  const initialCode = drill.draft?.code ?? drill.starterCode;
  const [code, setCodeState] = React.useState(initialCode);
  // Handlers read the latest code from a ref, so a run started right after an edit
  // (or from the editor's Ctrl+Enter) never tests a stale copy
  const codeRef = React.useRef(initialCode);
  // Practice code autosaves to the server a few seconds after the last edit
  const lastSavedRef = React.useRef(initialCode);
  const draftTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Multi-file drills: the other files, as the learner has them
  const multi = drill.files.length > 0;
  const starterFiles = React.useMemo(
    () => Object.fromEntries(drill.files.map((d) => [d.path, d.starter])),
    [drill.files]
  );
  const [files, setFilesState] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      drill.files.map((d) => [d.path, (d.editable && drill.draft?.files?.[d.path]) || d.starter])
    )
  );
  const filesRef = React.useRef(files);
  const [activeFile, setActiveFile] = React.useState(drill.mainFile);
  const activeDef = drill.files.find((d) => d.path === activeFile) ?? null;
  const lastDraftRef = React.useRef("");
  // Shown quietly beside the attempt count once a draft has reached the server
  const [draftSaved, setDraftSaved] = React.useState(false);
  const scheduleDraft = React.useCallback(() => {
    if (drill.mode.kind !== "practice" || drill.type === "predict") return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const now = JSON.stringify([codeRef.current, filesRef.current]);
      if (
        now === lastDraftRef.current ||
        (!lastDraftRef.current && codeRef.current === lastSavedRef.current && !multi)
      )
        return;
      const body = JSON.stringify({
        code: codeRef.current,
        ...(multi ? { files: filesRef.current } : {}),
      });
      void fetch(`/api/exercises/${drill.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: body.length < 60_000,
      }).then(
        (r) => {
          if (r.ok) {
            lastDraftRef.current = now;
            setDraftSaved(true);
          }
        },
        () => {}
      );
    }, 2500);
  }, [drill.id, drill.mode.kind, drill.type, multi]);
  const setCode = React.useCallback(
    (next: string) => {
      codeRef.current = next;
      setCodeState(next);
      scheduleDraft();
    },
    [scheduleDraft]
  );
  const setFile = React.useCallback(
    (path: string, next: string) => {
      filesRef.current = { ...filesRef.current, [path]: next };
      setFilesState(filesRef.current);
      scheduleDraft();
    },
    [scheduleDraft]
  );
  const [answer, setAnswer] = React.useState("");
  const [stdin, setStdin] = React.useState("");
  const [busy, setBusy] = React.useState<"check" | "run" | null>(null);
  const [check, setCheck] = React.useState<CheckState>({ kind: "idle" });
  const [runResult, setRunResult] = React.useState<RunResult | null>(null);
  /** The code that Run ran, so its output can say what the code defined */
  const [ranCode, setRanCode] = React.useState("");
  const [attempts, setAttempts] = React.useState(drill.stats.attempts);
  const [solved, setSolved] = React.useState(drill.stats.solved);
  const [solution, setSolution] = React.useState(drill.solution);
  const [solutionFiles, setSolutionFiles] = React.useState<Record<string, string> | null>(
    drill.solutionFiles
  );
  const [solutionOpen, setSolutionOpen] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [xpGained, setXpGained] = React.useState<number | null>(null);
  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [confetti, setConfetti] = React.useState(false);
  const [levelUp, setLevelUp] = React.useState<number | null>(null);
  // The pass that finished the lesson (and, on the on-ramp's last lesson, the white belt ceremony)
  const [lessonDone, setLessonDone] = React.useState<LessonDone | null>(null);
  const [ceremony, setCeremony] = React.useState<UnlockedAchievement | null>(null);
  const [reviewOutcome, setReviewOutcome] = React.useState<SubmitResponse["review"]>(null);
  const [progress, setProgress] = React.useState<{ passedCount: number; total: number } | null>(
    null
  );
  const [finished, setFinished] = React.useState<{ score: number; passed: boolean } | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  // The save runs after the result is on screen: what it's saving, and an attempt to send again
  // if it failed on the way
  const [saving, setSaving] = React.useState<{ passed: boolean } | null>(null);
  const [retry, setRetry] = React.useState<{
    passed: boolean;
    submitted: string;
    summary: unknown;
  } | null>(null);
  // The server's verdict on the latest attempt (with server grading it can overrule the browser's)
  const [verdict, setVerdict] = React.useState<boolean | null>(null);
  // A link followed while a pass was saving: taken once the save (and its celebrations) are done
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const router = useRouter();
  const busyRef = React.useRef(false);
  const tutorRef = React.useRef<TutorHandle>(null);
  // Asking the tutor in a review counts as help, like a hint
  const tutorUsedRef = React.useRef(false);
  const tutorOn = mode.kind !== "checkpoint";
  // Checkpoints lock the clipboard: the answer is typed, not pasted in, and the drill isn't copied out.
  // The note shows where the learner last tried (the task, or the code)
  const lockClipboard = mode.kind === "checkpoint";
  const [clipboardNote, setClipboardNote] = React.useState<"task" | "code" | null>(null);
  // The phone's folded task above the editor: open until the first run's results are in
  const [taskPeekOpen, setTaskPeekOpen] = React.useState(true);
  const taskPeekFolded = React.useRef(false);
  const foldTaskPeek = () => {
    if (taskPeekFolded.current) return;
    taskPeekFolded.current = true;
    setTaskPeekOpen(false);
  };
  const codeBlocked = () => setClipboardNote("code");
  const explain: Explain =
    tutorOn && aiKeys.length > 0 ? (error) => tutorRef.current?.explain(errorText(error)) : null;

  React.useEffect(() => {
    getPythonRuntime().preload();
  }, []);

  const loading = runtimeStatus === "loading";

  React.useEffect(() => {
    // The ceremony is its own way on (to module 1), so a held link waits for it to close
    if (
      !pendingHref ||
      saving ||
      saveError ||
      achievements.length > 0 ||
      levelUp !== null ||
      ceremony
    )
      return;
    // A moment to see the XP land before the page moves on
    const timer = window.setTimeout(
      () => {
        startNavigation();
        router.push(pendingHref);
      },
      xpGained ? 900 : 0
    );
    return () => window.clearTimeout(timer);
  }, [pendingHref, saving, saveError, achievements.length, levelUp, xpGained, ceremony, router]);

  async function record(passed: boolean, submitted: string, summary: unknown) {
    setSaving({ passed });
    setRetry(null);
    setSaveError(null);
    try {
      const res = await fetch(`/api/exercises/${drill.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: submitted,
          ...(multi ? { files: filesRef.current } : {}),
          passed,
          testResults: JSON.stringify(summary),
          hintsUsed: hintsUsed + (tutorUsedRef.current ? 1 : 0),
          mode: mode.kind,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setSaveError(body?.error ?? "Couldn’t save this attempt.");
        // The server or its grader stumbled: worth another go (a closed checkpoint isn't)
        if (res.status >= 500) setRetry({ passed, submitted, summary });
        setPendingHref(null);
        return;
      }
      const data = (await res.json()) as SubmitResponse;
      setVerdict(data.submission.passed);
      const lessonXp = data.lesson?.xpGained ?? 0;
      setAnnouncement(
        data.submission.passed
          ? `${data.xpGained + lessonXp > 0 ? `Saved: plus ${data.xpGained + lessonXp} XP.` : "Saved."}${data.lesson ? " Lesson finished." : ""}`
          : "Attempt saved."
      );
      if (data.lesson) setLessonDone(data.lesson);
      // Saved, but with something to read first (the server overruled the browser, or the checkpoint
      // closed): a link followed during the save stays put rather than moving past the message
      if (data.gradingDisagreed) {
        setSaveError(
          data.submission.passed
            ? "The server re-ran the tests and they passed there, so this counts as a pass."
            : "The server re-ran the tests and not all of them passed there, so this attempt counts as failed. Check for code that depends on timing or randomness."
        );
        setPendingHref(null);
      }
      if (data.review?.counted) setReviewOutcome(data.review);
      if (data.checkpoint && "error" in data.checkpoint) {
        setSaveError(data.checkpoint.error);
        setPendingHref(null);
      } else if (data.checkpoint) {
        setProgress({ passedCount: data.checkpoint.passedCount, total: data.checkpoint.total });
        if (data.checkpoint.finished) setFinished(data.checkpoint.finished);
      }
      setAttempts(data.submission.attempts);
      if (data.submission.passed) setSolved(true);
      if (data.solution) setSolution(data.solution);
      if (data.solutionFiles) setSolutionFiles(data.solutionFiles);
      if (data.xpGained + lessonXp > 0) {
        setXpGained(data.xpGained + lessonXp);
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3200);
      }
      // Finishing the on-ramp plays the white belt ceremony instead of a toast
      const tied = data.lesson?.onRamp
        ? data.achievements.find((a) => a.slug === WHITE_BELT_TIED)
        : undefined;
      if (tied) setCeremony(tied);
      // Ready to Train is celebrated by the quest's farewell, which the refresh below brings up
      const unlocked = data.achievements.filter((a) => a.slug !== QUEST_BADGE && a !== tied);
      if (unlocked.length > 0) setAchievements(unlocked);
      if (data.levelUp && data.newLevel) setLevelUp(data.newLevel);
      if (data.submission.passed) questRefresh();
    } catch {
      setSaveError("This attempt didn’t save: the connection dropped.");
      setRetry({ passed, submitted, summary });
      setPendingHref(null);
    } finally {
      setSaving(null);
    }
  }

  async function runCheck() {
    if (busyRef.current || saving) return;
    if (isPredict && !answer.trim()) return;
    busyRef.current = true;
    setBusy("check");
    setVerdict(null);
    setAnnouncement("");
    // Grading happens here; saving the attempt happens after the result is on screen,
    // so the buttons are free again as soon as the learner can read the outcome
    let attempt: { passed: boolean; submitted: string; summary: unknown } | null = null;
    try {
      const runtime = getPythonRuntime();
      if (isPredict) {
        const real = await runtime.run(drill.starterCode, {
          packages: drill.packages,
          timeoutMs: drill.timeoutMs,
        });
        const actual = real.stdout;
        const correct = real.status === "ok" && normaliseOutput(answer) === normaliseOutput(actual);
        const wrongLine = correct ? null : firstDifferentLine(actual, answer);
        setCheck({ kind: "predict", correct, wrongLine, actual, error: real.error });
        foldTaskPeek();
        setAnnouncement(
          correct
            ? "Correct: that's exactly what it prints."
            : `Not quite.${wrongLine ? ` Line ${wrongLine} of your answer doesn't match.` : ""}`
        );
        attempt = { passed: correct, submitted: answer, summary: { kind: "predict", correct } };
      } else {
        const submitted = codeRef.current;
        setRunResult(null);
        const result = await runtime.test(submitted, drill.tests, {
          packages: drill.packages,
          // Each test has its own 2 s limit inside the runner; the whole run gets room for all of them
          timeoutMs: Math.max(drill.timeoutMs, (drill.testList.length + 1) * 2500) + 1000,
          importSolution: drill.importSolution,
          files: multi ? filesRef.current : undefined,
          mainName: drill.mainFile,
        });
        setCheck({ kind: "tests", result });
        setAnnouncement(spokenTests(result));
        if (!(result.status === "ok" && result.passed === true)) questBug("tests-failed");
        foldTaskPeek();
        // The drill's own tests failing to load isn't the learner's attempt
        if (!(result.status === "error" && result.phase === "tests")) {
          attempt = {
            passed: result.status === "ok" && result.passed === true,
            submitted,
            summary: {
              status: result.status,
              tests: result.tests.map((t) => ({ name: t.name, passed: t.passed })),
            },
          };
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
    if (attempt) await record(attempt.passed, attempt.submitted, attempt.summary);
  }

  async function runCode() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("run");
    setAnnouncement("");
    try {
      const lines =
        stdin.length > 0 ? stdin.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n") : null;
      const source = isPredict ? drill.starterCode : codeRef.current;
      const result = await getPythonRuntime().run(source, {
        stdin: lines,
        packages: drill.packages,
        timeoutMs: drill.timeoutMs + 1000,
        files: multi ? filesRef.current : undefined,
      });
      setRanCode(source);
      setRunResult(result);
      // Step 4 of the quest: the sensei moves from "run it" to "read the error"
      questBug(result.status === "ok" ? "ran-clean" : "ran-error");
      setAnnouncement(spokenRun(result, definedFunctions(source)));
      foldTaskPeek();
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function reset() {
    setCode(drill.starterCode);
    if (multi) {
      filesRef.current = { ...starterFiles };
      setFilesState(filesRef.current);
    }
    setCheck({ kind: "idle" });
    setRunResult(null);
  }

  const allPassed =
    (check.kind === "tests" && check.result.status === "ok" && check.result.passed === true) ||
    (check.kind === "predict" && check.correct);
  // Short busy labels: the line beside the buttons says what's running in full
  const checkLabels = isPredict
    ? ["Check answer", "Checking…", "Saving…"]
    : ["Run tests", "Running…", "Saving…"];
  const checkLabel = busy === "check" ? checkLabels[1] : saving ? checkLabels[2] : checkLabels[0];
  const checkBusy = busy === "check" || saving !== null;
  // What the save says while it works, in this drill's mode
  const savingLines = (passed: boolean) =>
    passed
      ? [
          mode.kind === "review"
            ? "Saving your review…"
            : mode.kind === "checkpoint"
              ? "Saving your answer…"
              : "Saving your pass…",
          ...(serverGrading ? ["Double-checking your tests on our server…"] : []),
          mode.kind === "review"
            ? "Scheduling your next review…"
            : mode.kind === "checkpoint"
              ? "Updating your grading…"
              : "Adding your XP…",
        ]
      : [
          "Saving this attempt…",
          ...(serverGrading ? ["Re-running your tests on our server…"] : []),
        ];
  const saveLine = (passed: boolean, live = true) => (
    <PendingLine
      live={live}
      lines={savingLines(passed)}
      still="Still saving: the server is taking a moment."
      slow="Taking longer than usual. Keep this page open and it will finish."
    />
  );
  // Links away from the drill wait for a pass to save, then go (after its celebrations)
  const guard = (href: string) => (event: React.MouseEvent) => {
    if (!saving) return;
    event.preventDefault();
    holdNavigation();
    setPendingHref(href);
  };
  // Predict drills show the real output only once solved or after enough tries, and never in an exam
  const canRunPredict = !isPredict || (!exam && (solved || solution !== null));
  // The box for Run's input appears once the code calls input() (in any of its files), and stays
  // while it holds something
  const readsInput =
    /\binput\(/.test(code) || (multi && Object.values(files).some((f) => /\binput\(/.test(f)));
  const showInput = !isPredict && (readsInput || stdin !== "");

  const workspace = (
    <div className="flex flex-col gap-4">
      {isPredict ? (
        <>
          <div className="overflow-hidden rounded-md border border-border">
            <p className="border-b border-border bg-sheet px-4 py-1.5 text-xs font-semibold text-muted-foreground">
              The code
            </p>
            <PythonEditor
              value={drill.starterCode}
              onChange={() => {}}
              readOnly
              height="260px"
              lockClipboard={lockClipboard}
              onClipboardBlocked={codeBlocked}
              ariaLabel={`The code for ${drill.title} (read-only)`}
            />
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">What does it print?</span>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              {...(lockClipboard && {
                onPaste: blockClipboard(codeBlocked),
                onDrop: blockClipboard(codeBlocked),
                onCopy: blockClipboard(codeBlocked),
                onCut: blockClipboard(codeBlocked),
              })}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void runCheck();
                }
              }}
              rows={5}
              spellCheck={false}
              placeholder="Type the output exactly, one line per line"
              className="font-mono text-sm"
            />
          </label>
        </>
      ) : (
        <div className={cn(multi && "overflow-hidden rounded-md border border-border")}>
          {multi && (
            <div
              role="tablist"
              aria-label="Files"
              className="flex flex-wrap gap-px border-b border-border bg-sheet"
            >
              {[{ path: drill.mainFile, editable: true }, ...drill.files].map((file) => (
                <button
                  key={file.path}
                  type="button"
                  role="tab"
                  aria-selected={activeFile === file.path}
                  onClick={() => setActiveFile(file.path)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 font-mono text-[0.8125rem]",
                    activeFile === file.path
                      ? "bg-background font-semibold text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {!file.editable && <Lock className="size-3" aria-label="Read-only" />}
                  {file.path}
                </button>
              ))}
            </div>
          )}
          {/* Every file keeps its own editor mounted (tabs only hide them): unmounting Monaco
              mid-request logs "Canceled" errors and would also lose each file's undo history */}
          <div className={cn(activeDef && "hidden")}>
            <PythonEditor
              value={code}
              onChange={(v) => {
                setCode(v);
                if (v !== drill.starterCode) questBug("edited");
              }}
              storageKey={EDITOR_KEY[mode.kind](drill)}
              valueSavedAt={drill.draft?.savedAt ?? null}
              onRun={() => void runCheck()}
              height="420px"
              lockClipboard={lockClipboard}
              onClipboardBlocked={codeBlocked}
              ariaLabel={
                multi
                  ? `${drill.mainFile}: your code for ${drill.title}`
                  : `Your code for ${drill.title}`
              }
              keyLegend
            />
          </div>
          {drill.files.map((def) => (
            <div key={def.path} className={cn(activeDef?.path !== def.path && "hidden")}>
              <PythonEditor
                value={files[def.path] ?? def.starter}
                onChange={(v) => {
                  if (def.editable) setFile(def.path, v);
                }}
                readOnly={!def.editable}
                language={languageFor(def.path)}
                storageKey={
                  def.editable ? `${EDITOR_KEY[mode.kind](drill)}:${def.path}` : undefined
                }
                valueSavedAt={drill.draft?.savedAt ?? null}
                onRun={() => void runCheck()}
                height="420px"
                lockClipboard={lockClipboard}
                onClipboardBlocked={codeBlocked}
                ariaLabel={
                  def.editable
                    ? `${def.path}: your code for ${drill.title}`
                    : `${def.path} (read-only)`
                }
                keyLegend={def.editable}
              />
            </div>
          ))}
        </div>
      )}
      {lockClipboard && <ClipboardNote shown={clipboardNote === "code"} />}

      {showInput && (
        <label className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between text-sm font-semibold">
            Input for Run
            <span className="text-xs font-normal text-muted-foreground">
              One line per input() call
            </span>
          </span>
          <Textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
            spellCheck={false}
            className="font-mono text-sm"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={() => void runCheck()}
          data-quest-target="run-tests"
          aria-busy={checkBusy}
          aria-disabled={busy !== null || saving !== null || (isPredict && !answer.trim())}
          className={cn("justify-start", (busy !== null || saving) && "cursor-progress")}
        >
          {checkBusy ? (
            <Spinner />
          ) : isPredict ? (
            <Check aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {/* Every label in one cell, start-aligned beside the icon: one width, no jump */}
          <span className="grid justify-items-start text-left">
            {checkLabels.map((label) => (
              <span
                key={label}
                className={cn("col-start-1 row-start-1", label !== checkLabel && "invisible")}
              >
                {label}
              </span>
            ))}
          </span>
        </Button>
        {canRunPredict && (
          <Button
            variant="outline"
            onClick={() => void runCode()}
            data-quest-target="run-code"
            aria-busy={busy === "run"}
            aria-disabled={busy !== null}
          >
            {busy === "run" ? <Spinner /> : <TerminalSquare aria-hidden="true" />}
            {isPredict ? "Run it" : "Run"}
          </Button>
        )}
        {!isPredict && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={
              code === drill.starterCode &&
              Object.entries(starterFiles).every(([p, v]) => files[p] === v)
            }
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        )}
        <div className="ml-auto min-w-0 text-xs text-muted-foreground">
          {loading || (busy !== null && runtimeText) ? (
            <PendingLine
              key="python"
              className="text-xs"
              lines={[runtimeText || "Downloading Python…"]}
              still="The first time takes a few seconds; after that it's quick."
              slow="Still downloading: a slow connection takes longer."
            />
          ) : busy === "check" ? (
            <PendingLine
              key="tests"
              className="text-xs"
              delayMs={700}
              lines={["Running your tests…"]}
              still="Some tests take a few seconds."
            />
          ) : exam ? null : (
            // "solved earlier" while the run on screen fails, so the line never contradicts the results
            `${attempts} ${attempts === 1 ? "attempt" : "attempts"}${solved ? (check.kind !== "idle" && !allPassed ? " · solved earlier" : " · solved") : ""}${draftSaved ? " · draft saved" : ""}`
          )}
        </div>
      </div>

      {/* Not a live region: the announcement below says each outcome once, in a sentence */}
      <div
        data-quest-target="drill-output"
        className={cn("flex flex-col gap-4 transition-opacity", busy && "opacity-60")}
      >
        {check.kind === "tests" && <TestResults result={check.result} onExplain={explain} />}
        {check.kind === "predict" &&
          (check.correct ? (
            <div className="rounded-md border border-success/35 bg-success/6 p-4">
              <p className="font-semibold text-success">That’s exactly what it prints.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-sheet p-4">
              <p className="font-semibold">Not quite.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {check.wrongLine
                  ? `Line ${check.wrongLine} of your answer doesn't match. Trace the code again from the top.`
                  : "Check the spacing and the number of lines."}
              </p>
            </div>
          ))}
        {runResult && <RunOutput result={runResult} code={ranCode} onExplain={explain} />}
        {saving && !saving.passed && saveLine(false, false)}
        {saveError && (
          <div className="flex flex-wrap items-center gap-3">
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
            {retry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void record(retry.passed, retry.submitted, retry.summary)}
              >
                <RotateCcw aria-hidden="true" />
                Try again
              </Button>
            )}
          </div>
        )}
      </div>
      {/* The drill's one voice for outcomes: the run's result, then whether it saved */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {allPassed && verdict !== false && mode.kind === "checkpoint" && (
        <div className="flex flex-wrap items-center gap-5 rounded-md border border-border bg-accent/55 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {finished ? (finished.passed ? "Grading passed" : "Grading closed") : "Drill passed"}
              {xpGained ? (
                <span className="font-condensed tabular text-primary-ink"> · +{xpGained} XP</span>
              ) : null}
            </p>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {saving
                ? saveLine(true)
                : finished
                  ? `You scored ${Math.round(finished.score * 100)}%.`
                  : progress
                    ? `${progress.passedCount} of ${progress.total} done.`
                    : saveError
                      ? "Not saved yet."
                      : null}
            </div>
          </div>
          {drill.next && !finished ? (
            <WaitLink href={`/exercises/${drill.next.id}`} pending={pendingHref} onClick={guard}>
              Next drill
              <ArrowRight aria-hidden="true" />
            </WaitLink>
          ) : (
            <WaitLink
              href={`/checkpoints/${mode.attemptId}`}
              pending={pendingHref}
              onClick={guard}
              variant={finished ? "default" : "outline"}
            >
              {finished ? "See the result" : "Back to the grading"}
            </WaitLink>
          )}
          {finished?.passed ? (
            <Seal label="Passed" detail="Grading" animate className="shrink-0" />
          ) : null}
        </div>
      )}

      {allPassed && verdict !== false && mode.kind === "review" && (
        <div className="flex flex-wrap items-center gap-5 rounded-md border border-border bg-accent/55 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Recalled
              {xpGained ? (
                <span className="font-condensed tabular text-primary-ink"> · +{xpGained} XP</span>
              ) : null}
            </p>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {saving
                ? saveLine(true)
                : reviewOutcome?.nextDueAt
                  ? `It comes back in ${daysUntil(reviewOutcome.nextDueAt)} ${daysUntil(reviewOutcome.nextDueAt) === 1 ? "day" : "days"}.`
                  : "Practice only; the schedule didn’t change."}
            </div>
          </div>
          <WaitLink href="/review" pending={pendingHref} onClick={guard}>
            Back to review
            <ArrowRight aria-hidden="true" />
          </WaitLink>
        </div>
      )}

      {allPassed && verdict !== false && mode.kind === "practice" && (
        // The seal is pressed into the strip at every width: in its corner on phones, beside it on wider screens
        <div
          className={cn(
            "relative flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md border border-border bg-accent/55 px-5 py-4",
            xpGained && "max-sm:pt-6"
          )}
        >
          <div className={cn("min-w-0 flex-1 basis-56", xpGained && "max-sm:pr-20")}>
            <p className="font-semibold">
              {lessonDone ? "Lesson finished" : "Drill passed"}
              {xpGained ? (
                <span className="font-condensed tabular text-primary-ink"> · +{xpGained} XP</span>
              ) : null}
            </p>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {saving
                ? saveLine(true)
                : lessonDone
                  ? lessonDone.next
                    ? `${drill.lesson.title} is complete. Next: ${lessonDone.next.title}.`
                    : `${drill.lesson.title} is complete: that was the module's last lesson, so its grading is open.`
                  : `Drill ${drill.position.index + 1} of ${drill.position.total} in ${drill.lesson.title}. ${
                      drill.next ? "On to the next one." : "That was the last one."
                    }`}
            </div>
          </div>
          {lessonDone ? (
            <WaitLink
              href={
                lessonDone.next
                  ? `/lessons/${lessonDone.next.id}`
                  : `/modules/${lessonDone.moduleId}#checkpoint-heading`
              }
              pending={pendingHref}
              onClick={guard}
            >
              {lessonDone.next ? "Next lesson" : "To the grading"}
              <ArrowRight aria-hidden="true" />
            </WaitLink>
          ) : drill.next ? (
            <WaitLink href={`/exercises/${drill.next.id}`} pending={pendingHref} onClick={guard}>
              Next drill
              <ArrowRight aria-hidden="true" />
            </WaitLink>
          ) : (
            <WaitLink
              href={`/lessons/${drill.lesson.id}`}
              pending={pendingHref}
              onClick={guard}
              variant="outline"
            >
              Back to the lesson
            </WaitLink>
          )}
          {xpGained ? (
            <Seal
              label="Passed"
              detail={lessonDone ? "Lesson" : "Drill"}
              animate
              className="shrink-0 max-sm:absolute max-sm:top-2 max-sm:right-3 max-sm:origin-top-right max-sm:scale-75"
            />
          ) : null}
        </div>
      )}

      {tutorOn && (
        <TutorPanel
          ref={tutorRef}
          exerciseId={drill.id}
          aiKeys={aiKeys}
          getContext={() => ({
            code: isPredict
              ? drill.starterCode
              : combinedSource(
                  drill.mainFile,
                  codeRef.current,
                  multi ? filesRef.current : undefined
                ),
            result: describeCheck(check, runResult, answer),
          })}
          onUsed={() => {
            tutorUsedRef.current = true;
          }}
        />
      )}

      {solution !== null && !isPredict && (
        <section className="rounded-md border border-border">
          <button
            type="button"
            onClick={() => setSolutionOpen((v) => !v)}
            aria-expanded={solutionOpen}
            className="flex w-full items-center justify-between rounded-md px-4 py-3 text-left text-sm font-semibold hover:bg-accent/50"
          >
            <span className="flex items-center gap-2">
              <SheetMark className="size-4 text-muted-foreground" />
              {solved ? "Compare with the reference solution" : "Show the reference solution"}
            </span>
            <ChevronDown
              className={cn("size-4 transition-transform", solutionOpen && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          {solutionOpen && (
            <div className="border-t border-border">
              {!solved && (
                <p className="border-b border-border px-4 py-2.5 text-sm text-muted-foreground">
                  Read it, close it, then write it yourself from memory. That’s where it sticks.
                </p>
              )}
              <PythonEditor
                value={combinedSource(
                  drill.mainFile,
                  solution,
                  drill.solutionFiles ?? solutionFiles ?? undefined
                )}
                onChange={() => {}}
                readOnly
                height="300px"
                ariaLabel="The reference solution (read-only)"
              />
            </div>
          )}
        </section>
      )}

      <nav
        className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm"
        aria-label="Drills"
      >
        {mode.kind === "review" ? (
          <Link
            href="/review"
            onClick={guard("/review")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            The review queue
          </Link>
        ) : drill.previous ? (
          <Link
            href={`/exercises/${drill.previous.id}`}
            onClick={guard(`/exercises/${drill.previous.id}`)}
            className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{drill.previous.title}</span>
          </Link>
        ) : (
          <Link
            href={
              mode.kind === "checkpoint"
                ? `/checkpoints/${mode.attemptId}`
                : `/lessons/${drill.lesson.id}`
            }
            onClick={guard(
              mode.kind === "checkpoint"
                ? `/checkpoints/${mode.attemptId}`
                : `/lessons/${drill.lesson.id}`
            )}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {mode.kind === "checkpoint" ? "The checkpoint" : "The lesson"}
          </Link>
        )}
        {drill.next && (
          <Link
            href={`/exercises/${drill.next.id}`}
            onClick={guard(`/exercises/${drill.next.id}`)}
            aria-busy={pendingHref === `/exercises/${drill.next.id}` || undefined}
            className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {pendingHref === `/exercises/${drill.next.id}` && (
              <Spinner className="size-4 shrink-0" />
            )}
            <span className="truncate">{drill.next.title}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        )}
      </nav>
    </div>
  );

  const prompt = (
    <PromptPanel
      drill={drill}
      check={check}
      hintsUsed={hintsUsed}
      onRevealHint={() => setHintsUsed((n) => Math.min(n + 1, drill.hints.length))}
      progress={progress}
      checkpointClosed={finished !== null}
      clipboardNote={clipboardNote === "task"}
      onClipboardBlocked={() => setClipboardNote("task")}
    />
  );

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        <Confetti active={confetti} particleCount={70} duration={2800} />
      </div>
      {levelUp !== null && (
        <LevelUpNotification level={levelUp} onDismiss={() => setLevelUp(null)} />
      )}
      {achievements.length > 0 && (
        <AchievementNotificationQueue
          achievements={achievements}
          onDone={() => setAchievements([])}
        />
      )}
      {ceremony && lessonDone?.onRamp && (
        <WhiteBeltCeremony
          open
          onOpenChange={(open) => {
            if (!open) setCeremony(null);
          }}
          xp={ceremony.xpReward}
          lessons={lessonDone.onRamp.lessons}
          nextHref={lessonDone.onRamp.nextHref}
        />
      )}

      {/* One copy of the task and the workspace: side by side on wide screens, switched on phones */}
      <div
        className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-muted p-1 lg:hidden"
        role="group"
        aria-label="Show"
      >
        {(["task", "code"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            aria-pressed={mobilePane === pane}
            onClick={() => setMobilePane(pane)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              mobilePane === pane
                ? "bg-background ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {pane === "task" ? "Task" : isPredict ? "Answer" : "Code"}
          </button>
        ))}
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
        <div
          className={cn(
            "lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-1",
            mobilePane !== "task" && "hidden"
          )}
        >
          {prompt}
        </div>
        <div className={cn("lg:block", mobilePane !== "code" && "hidden")}>
          {/* Phones only: the task is a pane away, so it's folded in above the editor too (open until the
              first run), keeping the expected output in reach while typing */}
          <details
            open={taskPeekOpen}
            onToggle={(event) => setTaskPeekOpen(event.currentTarget.open)}
            className={cn(
              "mb-4 rounded-md border border-border bg-sheet lg:hidden",
              lockClipboard && "select-none"
            )}
            {...(lockClipboard
              ? { onCopy: blockClipboard(codeBlocked), onCut: blockClipboard(codeBlocked) }
              : {})}
          >
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">The task</summary>
            <div className="max-h-72 overflow-y-auto border-t border-border px-4 py-3">
              <LessonContent
                content={drill.instructions}
                runnable={false}
                copyable={!lockClipboard}
                className="[&_p]:text-sm"
              />
            </div>
          </details>
          {workspace}
        </div>
      </div>
    </>
  );
}
