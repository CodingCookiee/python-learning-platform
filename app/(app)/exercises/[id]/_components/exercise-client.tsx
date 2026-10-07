"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Eye,
  Lock,
  Lightbulb,
  LoaderCircle,
  Play,
  Repeat,
  RotateCcw,
  TerminalSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LessonContent, PythonEditor, languageFor } from "@/components/lesson";
import { TapeMark } from "@/components/brand/marks";
import { Seal } from "@/components/brand/seal";
import { AchievementNotificationQueue, Confetti, LevelUpNotification } from "@/components/gamification";
import {
  getPythonRuntime,
  useRuntimeStatus,
  type PyError,
  type RunResult,
  type TestRunResult,
} from "@/lib/python-runtime";
import type { UnlockedAchievement } from "@/lib/achievements";
import type { DrillData, DrillMode, DrillType } from "@/lib/drills";
import { cn } from "@/lib/utils";
import { TutorPanel, type TutorHandle } from "@/components/tutor/tutor-panel";
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
  | { kind: "predict"; correct: boolean; wrongLine: number | null; actual: string; error: PyError | null };

// Error box: a traceback trimmed to the learner's own code

/** Explain a traceback with the tutor; absent when the tutor isn't available */
type Explain = ((error: PyError) => void) | null;

function errorText(error: PyError): string {
  return [`${error.type}: ${error.message}`, error.line ? `(line ${error.line})` : "", error.traceback ?? ""]
    .filter(Boolean)
    .join("\n");
}

function ErrorBox({ error, title, onExplain }: { error: PyError; title?: string; onExplain?: Explain }) {
  const heading =
    title ??
    (error.type === "Timeout"
      ? "Timed out"
      : error.line
        ? `${error.type} on line ${error.line}`
        : error.type);
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
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
        <span className="font-condensed tabular text-sm font-normal text-muted-foreground">{rows.length}</span>
      </h2>
      <ul className="flex flex-col border-t border-border" role="list">
        {rows.map((row, i) => (
          <li key={`${row.name}-${i}`} className="flex items-start gap-2.5 border-b border-border py-2.5 text-sm">
            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
              {row.passed === true ? (
                <Check className="size-4 text-success" />
              ) : row.passed === false ? (
                <X className="size-4 text-destructive" />
              ) : (
                <span className="size-3 rounded-[2px] border border-(--keyline)/45" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              {row.name}
              {row.hidden && <span className="ml-2 text-xs text-muted-foreground">hidden</span>}
            </span>
            <span className="sr-only">{row.passed === true ? "passed" : row.passed === false ? "failed" : "not run yet"}</span>
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
        <Lightbulb className="size-4 text-(--code-string)" aria-hidden="true" />
        Hints
      </h2>
      {used > 0 && (
        <ol className="mt-3 flex flex-col gap-2.5" role="list">
          {hints.slice(0, used).map((hint, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="font-condensed tabular font-bold text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <LessonContent content={hint} runnable={false} className="[&_p]:mb-0 [&_p]:text-sm" />
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

function ModeBanner({ mode, progress }: { mode: DrillMode; progress: { passedCount: number; total: number } | null }) {
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
      <span className="font-semibold">Checkpoint</span>
      <span className="font-condensed tabular text-muted-foreground">
        {done.passedCount} of {done.total} passed
      </span>
      <span
        className={cn(
          "font-condensed tabular ml-auto flex items-center gap-1.5",
          left !== null && left < 5 * 60_000 ? "font-bold text-destructive" : "text-muted-foreground"
        )}
      >
        <Clock className="size-3.5" aria-hidden="true" />
        {left === null ? "…" : left === 0 ? "Time’s up" : `${formatClock(left)} left`}
      </span>
      <p className="basis-full text-muted-foreground">No hints and no reference solution. Run the tests as often as you like.</p>
    </div>
  );
}

function PromptPanel({
  drill,
  check,
  hintsUsed,
  onRevealHint,
  progress,
}: {
  drill: DrillData;
  check: CheckState;
  hintsUsed: number;
  onRevealHint: () => void;
  progress: { passedCount: number; total: number } | null;
}) {
  const inCheckpoint = drill.mode.kind === "checkpoint";
  return (
    <div className="flex flex-col gap-6">
      <ModeBanner mode={drill.mode} progress={progress} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            {TYPE_LABEL[drill.type]}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground" aria-label={`Difficulty: ${drill.difficulty}`}>
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
        <h1 className="font-condensed text-4xl leading-[0.98] font-extrabold tracking-[-0.02em]">{drill.title}</h1>
        {drill.position.total > 1 && drill.mode.kind !== "review" && (
          <p className="font-condensed tabular text-sm text-muted-foreground">
            Drill {drill.position.index + 1} of {drill.position.total}{" "}
            {inCheckpoint ? "in the checkpoint" : `in ${drill.lesson.title}`}
          </p>
        )}
        {drill.mode.kind === "review" && (
          <p className="text-sm text-muted-foreground">
            From {drill.lesson.title}, {drill.module.title}
          </p>
        )}
      </div>

      <LessonContent content={drill.instructions} runnable={false} className="[&_p]:text-base" />
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
        <ErrorBox error={result.error!} title={title} onExplain={result.phase === "tests" ? null : onExplain} />
        {result.stdout && <PrintedOutput text={result.stdout} />}
      </div>
    );
  }
  const passed = result.tests.filter((t) => t.passed).length;
  const total = result.tests.length;
  const all = passed === total;
  return (
    <div className={cn("rounded-md border p-4", all ? "border-success/35 bg-success/6" : "border-border bg-sheet")}>
      <p className={cn("font-condensed tabular text-lg font-bold", all ? "text-success" : "text-foreground")}>
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
                    {t.hidden && <span className="ml-2 text-xs font-normal text-muted-foreground">hidden</span>}
                  </p>
                  {t.message && (
                    <p className="mt-0.5 font-mono text-[0.8125rem] leading-5 wrap-break-word whitespace-pre-wrap text-destructive">
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
                    <ChevronDown className={cn("size-3.5 transition-transform", open === i && "rotate-180")} aria-hidden="true" />
                  </button>
                )}
              </div>
              {open === i && (
                <div className="mt-2 ml-6 flex flex-col gap-2">
                  {t.stdout && <PrintedOutput text={t.stdout} />}
                  {t.error?.traceback && (
                    <pre className="overflow-x-auto rounded-sm bg-destructive/5 p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-muted-foreground">
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
      <p className="border-b border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted-foreground">{label}</p>
      <pre className="max-h-72 overflow-auto px-3 py-2 font-mono text-[0.8125rem] leading-6 whitespace-pre-wrap">
        {text.trimEnd() || <span className="text-muted-foreground">(nothing)</span>}
      </pre>
    </div>
  );
}

function RunOutput({ result, onExplain }: { result: RunResult; onExplain?: Explain }) {
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
function describeCheck(check: CheckState, run: RunResult | null, answer: string): string | undefined {
  const parts: string[] = [];
  if (check.kind === "tests") {
    const r = check.result;
    if (r.status === "timeout") parts.push("The test run timed out.");
    else if (r.status === "error" && r.error) parts.push(`The tests couldn't run: ${errorText(r.error)}`);
    else {
      const passed = r.tests.filter((t) => t.passed).length;
      parts.push(`${passed} of ${r.tests.length} tests passed.`);
      for (const t of r.tests.filter((t) => !t.passed)) parts.push(`FAILED ${t.name}${t.message ? `: ${t.message}` : ""}`);
    }
  } else if (check.kind === "predict") {
    parts.push(`My predicted output:\n${answer}\n\nThat was ${check.correct ? "correct" : "not correct"}.`);
  }
  if (run) {
    parts.push(`Output of my last Run:\n${run.stdout || "(nothing printed)"}`);
    if (run.error) parts.push(errorText(run.error));
  }
  return parts.length ? parts.join("\n") : undefined;
}

export function ExerciseClient({ drill, aiReady }: { drill: DrillData; aiReady: boolean }) {
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
  const starterFiles = React.useMemo(() => Object.fromEntries(drill.files.map((d) => [d.path, d.starter])), [drill.files]);
  const [files, setFilesState] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(drill.files.map((d) => [d.path, (d.editable && drill.draft?.files?.[d.path]) || d.starter]))
  );
  const filesRef = React.useRef(files);
  const [activeFile, setActiveFile] = React.useState(drill.mainFile);
  const activeDef = drill.files.find((d) => d.path === activeFile) ?? null;
  const lastDraftRef = React.useRef("");
  const scheduleDraft = React.useCallback(() => {
    if (drill.mode.kind !== "practice" || drill.type === "predict") return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const now = JSON.stringify([codeRef.current, filesRef.current]);
      if (now === lastDraftRef.current || (!lastDraftRef.current && codeRef.current === lastSavedRef.current && !multi)) return;
      const body = JSON.stringify({ code: codeRef.current, ...(multi ? { files: filesRef.current } : {}) });
      void fetch(`/api/exercises/${drill.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: body.length < 60_000,
      }).then((r) => {
        if (r.ok) lastDraftRef.current = now;
      }, () => {});
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
  const [attempts, setAttempts] = React.useState(drill.stats.attempts);
  const [solved, setSolved] = React.useState(drill.stats.solved);
  const [solution, setSolution] = React.useState(drill.solution);
  const [solutionFiles, setSolutionFiles] = React.useState<Record<string, string> | null>(drill.solutionFiles);
  const [solutionOpen, setSolutionOpen] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [xpGained, setXpGained] = React.useState<number | null>(null);
  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [confetti, setConfetti] = React.useState(false);
  const [levelUp, setLevelUp] = React.useState<number | null>(null);
  const [reviewOutcome, setReviewOutcome] = React.useState<SubmitResponse["review"]>(null);
  const [progress, setProgress] = React.useState<{ passedCount: number; total: number } | null>(null);
  const [finished, setFinished] = React.useState<{ score: number; passed: boolean } | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const busyRef = React.useRef(false);
  const tutorRef = React.useRef<TutorHandle>(null);
  // Asking the tutor in a review counts as help, like a hint
  const tutorUsedRef = React.useRef(false);
  const tutorOn = mode.kind !== "checkpoint";
  const explain: Explain = tutorOn && aiReady ? (error) => tutorRef.current?.explain(errorText(error)) : null;

  React.useEffect(() => {
    getPythonRuntime().preload();
  }, []);

  const loading = runtimeStatus === "loading";

  async function record(passed: boolean, submitted: string, summary: unknown) {
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
      return;
    }
    setSaveError(null);
    const data = (await res.json()) as SubmitResponse;
    if (data.gradingDisagreed) {
      setSaveError(
        data.submission.passed
          ? "The server re-ran the tests and they passed there, so this counts as a pass."
          : "The server re-ran the tests and not all of them passed there, so this attempt counts as failed. Check for code that depends on timing or randomness."
      );
    }
    if (data.review?.counted) setReviewOutcome(data.review);
    if (data.checkpoint && "error" in data.checkpoint) setSaveError(data.checkpoint.error);
    else if (data.checkpoint) {
      setProgress({ passedCount: data.checkpoint.passedCount, total: data.checkpoint.total });
      if (data.checkpoint.finished) setFinished(data.checkpoint.finished);
    }
    setAttempts(data.submission.attempts);
    if (data.submission.passed) setSolved(true);
    if (data.solution) setSolution(data.solution);
    if (data.solutionFiles) setSolutionFiles(data.solutionFiles);
    if (data.xpGained > 0) {
      setXpGained(data.xpGained);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3200);
    }
    if (data.achievements.length > 0) setAchievements(data.achievements);
    if (data.levelUp && data.newLevel) setLevelUp(data.newLevel);
  }

  async function runCheck() {
    if (busyRef.current) return;
    if (isPredict && !answer.trim()) return;
    busyRef.current = true;
    setBusy("check");
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
        setCheck({
          kind: "predict",
          correct,
          wrongLine: correct ? null : firstDifferentLine(actual, answer),
          actual,
          error: real.error,
        });
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
        // The drill's own tests failing to load isn't the learner's attempt
        if (!(result.status === "error" && result.phase === "tests")) {
          attempt = {
            passed: result.status === "ok" && result.passed === true,
            submitted,
            summary: { status: result.status, tests: result.tests.map((t) => ({ name: t.name, passed: t.passed })) },
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
    try {
      const lines = stdin.length > 0 ? stdin.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n") : null;
      const result = await getPythonRuntime().run(isPredict ? drill.starterCode : codeRef.current, {
        stdin: lines,
        packages: drill.packages,
        timeoutMs: drill.timeoutMs + 1000,
        files: multi ? filesRef.current : undefined,
      });
      setRunResult(result);
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
  const checkLabel = loading ? "Loading Python…" : busy === "check" ? "Checking…" : isPredict ? "Check answer" : "Run tests";
  // Predict drills show the real output only once solved or after enough tries, and never in an exam
  const canRunPredict = !isPredict || (!exam && (solved || solution !== null));
  // Programs always read input; other drills get the box once their code calls input()
  const showInput = !isPredict && (drill.type === "program" || /\binput\(/.test(code));

  const workspace = (
    <div className="flex flex-col gap-4">
      {isPredict ? (
        <>
          <div className="overflow-hidden rounded-md border border-border">
            <p className="border-b border-border bg-sheet px-4 py-1.5 text-xs font-semibold text-muted-foreground">
              The code
            </p>
            <PythonEditor value={drill.starterCode} onChange={() => {}} readOnly height="260px" />
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">What does it print?</span>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
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
            <div role="tablist" aria-label="Files" className="flex flex-wrap gap-px border-b border-border bg-sheet">
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
              onChange={setCode}
              storageKey={EDITOR_KEY[mode.kind](drill)}
              valueSavedAt={drill.draft?.savedAt ?? null}
              onRun={() => void runCheck()}
              height="420px"
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
                storageKey={def.editable ? `${EDITOR_KEY[mode.kind](drill)}:${def.path}` : undefined}
                valueSavedAt={drill.draft?.savedAt ?? null}
                onRun={() => void runCheck()}
                height="420px"
              />
            </div>
          ))}
        </div>
      )}

      {showInput && (
        <label className="flex flex-col gap-1.5">
          <span className="flex items-baseline justify-between text-sm font-semibold">
            Input for Run
            <span className="text-xs font-normal text-muted-foreground">One line per input() call</span>
          </span>
          <Textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
            spellCheck={false}
            className="font-mono text-sm"
            placeholder={"Raza\n3"}
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={() => void runCheck()}
          aria-busy={busy === "check" || loading}
          aria-disabled={busy !== null || (isPredict && !answer.trim())}
          className={cn("min-w-36 justify-start", busy !== null && "cursor-progress")}
        >
          {busy === "check" || loading ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : isPredict ? (
            <Check aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {checkLabel}
        </Button>
        {canRunPredict && (
          <Button variant="outline" onClick={() => void runCode()} aria-busy={busy === "run"} aria-disabled={busy !== null}>
            {busy === "run" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <TerminalSquare aria-hidden="true" />
            )}
            {isPredict ? "Run it" : "Run"}
          </Button>
        )}
        {!isPredict && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={code === drill.starterCode && Object.entries(starterFiles).every(([p, v]) => files[p] === v)}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {loading
            ? runtimeText || "The first run downloads Python (a few seconds)"
            : runtimeText && runtimeStatus === "busy"
              ? runtimeText
              : exam
                ? ""
                : `${attempts} ${attempts === 1 ? "attempt" : "attempts"}${solved ? " · solved" : ""}`}
        </span>
      </div>

      <div aria-live="polite" className={cn("flex flex-col gap-4 transition-opacity", busy && "opacity-60")}>
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
        {runResult && <RunOutput result={runResult} onExplain={explain} />}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>

      {allPassed && mode.kind === "checkpoint" && (
        <div className="flex flex-wrap items-center gap-5 rounded-md border border-border bg-accent/55 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {finished ? (finished.passed ? "Checkpoint passed" : "Checkpoint closed") : "Drill passed"}
              {xpGained ? <span className="font-condensed tabular text-primary"> · +{xpGained} XP</span> : null}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {finished
                ? `You scored ${Math.round(finished.score * 100)}%.`
                : progress
                  ? `${progress.passedCount} of ${progress.total} done.`
                  : "Saving…"}
            </p>
          </div>
          {drill.next && !finished ? (
            <Button asChild>
              <Link href={`/exercises/${drill.next.id}`}>
                Next drill
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant={finished ? "default" : "outline"}>
              <Link href={`/checkpoints/${mode.attemptId}`}>{finished ? "See the result" : "Back to the checkpoint"}</Link>
            </Button>
          )}
          {finished?.passed ? <Seal label="Passed" detail="Checkpoint" animate className="hidden shrink-0 sm:inline-flex" /> : null}
        </div>
      )}

      {allPassed && mode.kind === "review" && (
        <div className="flex flex-wrap items-center gap-5 rounded-md border border-border bg-accent/55 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Recalled{xpGained ? <span className="font-condensed tabular text-primary"> · +{xpGained} XP</span> : null}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {reviewOutcome?.nextDueAt
                ? `It comes back in ${daysUntil(reviewOutcome.nextDueAt)} ${daysUntil(reviewOutcome.nextDueAt) === 1 ? "day" : "days"}.`
                : "Practice only; the schedule didn’t change."}
            </p>
          </div>
          <Button asChild>
            <Link href="/review">
              Back to review
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}

      {allPassed && mode.kind === "practice" && (
        <div className="flex items-center gap-5 rounded-md border border-border bg-accent/55 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Drill passed{xpGained ? <span className="font-condensed tabular text-primary"> · +{xpGained} XP</span> : null}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {drill.next ? "On to the next one." : "That's the last drill in this lesson."}
            </p>
          </div>
          {drill.next ? (
            <Button asChild>
              <Link href={`/exercises/${drill.next.id}`}>
                Next drill
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/lessons/${drill.lesson.id}`}>Back to the lesson</Link>
            </Button>
          )}
          {xpGained ? <Seal label="Passed" detail="Drill" animate className="hidden shrink-0 sm:inline-flex" /> : null}
        </div>
      )}

      {tutorOn && (
        <TutorPanel
          ref={tutorRef}
          exerciseId={drill.id}
          aiReady={aiReady}
          getContext={() => ({
            code: isPredict ? drill.starterCode : combinedSource(drill.mainFile, codeRef.current, multi ? filesRef.current : undefined),
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
              <Eye className="size-4 text-muted-foreground" aria-hidden="true" />
              {solved ? "Compare with the reference solution" : "Show the reference solution"}
            </span>
            <ChevronDown className={cn("size-4 transition-transform", solutionOpen && "rotate-180")} aria-hidden="true" />
          </button>
          {solutionOpen && (
            <div className="border-t border-border">
              {!solved && (
                <p className="border-b border-border px-4 py-2.5 text-sm text-muted-foreground">
                  Read it, close it, then write it yourself from memory. That’s where it sticks.
                </p>
              )}
              <PythonEditor
                value={combinedSource(drill.mainFile, solution, drill.solutionFiles ?? solutionFiles ?? undefined)}
                onChange={() => {}}
                readOnly
                height="300px"
              />
            </div>
          )}
        </section>
      )}

      <nav className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm" aria-label="Drills">
        {mode.kind === "review" ? (
          <Link href="/review" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            The review queue
          </Link>
        ) : drill.previous ? (
          <Link href={`/exercises/${drill.previous.id}`} className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{drill.previous.title}</span>
          </Link>
        ) : (
          <Link
            href={mode.kind === "checkpoint" ? `/checkpoints/${mode.attemptId}` : `/lessons/${drill.lesson.id}`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {mode.kind === "checkpoint" ? "The checkpoint" : "The lesson"}
          </Link>
        )}
        {drill.next && (
          <Link href={`/exercises/${drill.next.id}`} className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
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
    />
  );

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        <Confetti active={confetti} particleCount={70} duration={2800} />
      </div>
      {levelUp !== null && <LevelUpNotification level={levelUp} onDismiss={() => setLevelUp(null)} />}
      {achievements.length > 0 && <AchievementNotificationQueue achievements={achievements} />}

      {/* One copy of the task and the workspace: side by side on wide screens, switched on phones */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-md bg-muted p-1 lg:hidden" role="group" aria-label="Show">
        {(["task", "code"] as const).map((pane) => (
          <button
            key={pane}
            type="button"
            aria-pressed={mobilePane === pane}
            onClick={() => setMobilePane(pane)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
              mobilePane === pane ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {pane === "task" ? "Task" : isPredict ? "Answer" : "Code"}
          </button>
        ))}
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
        <div className={cn("lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-1", mobilePane !== "task" && "hidden")}>
          {prompt}
        </div>
        <div className={cn("lg:block", mobilePane !== "code" && "hidden")}>{workspace}</div>
      </div>
    </>
  );
}
