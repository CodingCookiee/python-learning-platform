"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  TerminalSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LessonContent, PythonEditor } from "@/components/lesson";
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
import type { DrillData, DrillType } from "@/lib/drills";
import { cn } from "@/lib/utils";

// Copy per drill type

const TYPE_LABEL: Record<DrillType, string> = {
  function: "Write the code",
  program: "Write a program",
  predict: "Predict the output",
  fix: "Fix the bug",
  refactor: "Refactor",
  tests: "Write the tests",
};

const NOT_IMPORTED: ReadonlySet<DrillType> = new Set(["program", "tests"]);

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

function ErrorBox({ error, title }: { error: PyError; title?: string }) {
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
    </div>
  );
}

// Prompt panel: the task, the test list, hints

function TestList({ drill, check }: { drill: DrillData; check: CheckState }) {
  const results = check.kind === "tests" ? check.result.tests : null;
  const rows =
    results && results.length > 0
      ? results.map((r) => ({ name: r.name, hidden: r.hidden, passed: r.passed as boolean | null }))
      : drill.testList.map((t) => ({ ...t, passed: null as boolean | null }));
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="tests-heading">
      <h2 id="tests-heading" className="mb-2 flex items-baseline gap-2 text-base font-semibold">
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
  if (hints.length === 0) return null;
  return (
    <section aria-labelledby="hints-heading" className="rounded-md border border-border bg-sheet p-4">
      <h2 id="hints-heading" className="flex items-center gap-2 text-base font-semibold">
        <Lightbulb className="size-4 text-(--code-string)" aria-hidden="true" />
        Hints
      </h2>
      {used > 0 && (
        <ol className="mt-3 flex flex-col gap-2.5" role="list">
          {hints.slice(0, used).map((hint, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="font-condensed tabular font-bold text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <LessonContent content={hint} className="[&_p]:mb-0 [&_p]:text-sm" />
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
        <p className="mt-3 text-xs text-muted-foreground">That's every hint.</p>
      )}
    </section>
  );
}

function PromptPanel({
  drill,
  check,
  hintsUsed,
  onRevealHint,
}: {
  drill: DrillData;
  check: CheckState;
  hintsUsed: number;
  onRevealHint: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
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
        {drill.position.total > 1 && (
          <p className="font-condensed tabular text-sm text-muted-foreground">
            Drill {drill.position.index + 1} of {drill.position.total} in {drill.lesson.title}
          </p>
        )}
      </div>

      <LessonContent content={drill.instructions} className="[&_p]:text-base" />
      {drill.type !== "predict" && <TestList drill={drill} check={check} />}
      <Hints hints={drill.hints} used={hintsUsed} onReveal={onRevealHint} />
    </div>
  );
}

// Results

function TestResults({ result }: { result: TestRunResult }) {
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
        <ErrorBox error={result.error!} title={title} />
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

function RunOutput({ result }: { result: RunResult }) {
  return (
    <div className="flex flex-col gap-3">
      {(result.stdout || !result.error) && <PrintedOutput text={result.stdout} label="Output" />}
      {result.stderr && <PrintedOutput text={result.stderr} label="Warnings" />}
      {result.error && <ErrorBox error={result.error} />}
    </div>
  );
}

// Workspace

interface SubmitResponse {
  submission: { attempts: number; passed: boolean };
  xpGained: number;
  newlySolved: boolean;
  achievements: UnlockedAchievement[];
  levelUp?: boolean;
  newLevel?: number;
  solution?: string | null;
}

export function ExerciseClient({ drill }: { drill: DrillData }) {
  const { status: runtimeStatus, text: runtimeText } = useRuntimeStatus();
  const isPredict = drill.type === "predict";

  const [code, setCode] = React.useState(drill.starterCode);
  const [answer, setAnswer] = React.useState("");
  const [stdin, setStdin] = React.useState("");
  const [busy, setBusy] = React.useState<"check" | "run" | null>(null);
  const [check, setCheck] = React.useState<CheckState>({ kind: "idle" });
  const [runResult, setRunResult] = React.useState<RunResult | null>(null);
  const [attempts, setAttempts] = React.useState(drill.stats.attempts);
  const [solved, setSolved] = React.useState(drill.stats.solved);
  const [solution, setSolution] = React.useState(drill.solution);
  const [solutionOpen, setSolutionOpen] = React.useState(false);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [xpGained, setXpGained] = React.useState<number | null>(null);
  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [confetti, setConfetti] = React.useState(false);
  const [levelUp, setLevelUp] = React.useState<number | null>(null);
  const busyRef = React.useRef(false);

  React.useEffect(() => {
    getPythonRuntime().preload();
  }, []);

  const loading = runtimeStatus === "loading";

  async function record(passed: boolean, submitted: string, summary: unknown) {
    const res = await fetch(`/api/exercises/${drill.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: submitted, passed, testResults: JSON.stringify(summary), hintsUsed }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as SubmitResponse;
    setAttempts(data.submission.attempts);
    if (data.submission.passed) setSolved(true);
    if (data.solution) setSolution(data.solution);
    if (data.newlySolved) {
      setXpGained(data.xpGained);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3200);
    }
    if (data.achievements.length > 0) setAchievements(data.achievements);
    if (data.levelUp && data.newLevel) setLevelUp(data.newLevel);
  }

  async function runCheck() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("check");
    try {
      const runtime = getPythonRuntime();
      if (isPredict) {
        const trimmed = answer.trim();
        if (!trimmed) return;
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
        await record(correct, answer, { kind: "predict", correct });
        return;
      }
      const result = await runtime.test(code, drill.tests, {
        packages: drill.packages,
        timeoutMs: drill.timeoutMs + 1000,
        importSolution: !NOT_IMPORTED.has(drill.type),
      });
      setCheck({ kind: "tests", result });
      // The drill's own tests failing to load isn't the learner's attempt
      if (result.status === "error" && result.phase === "tests") return;
      const passed = result.status === "ok" && result.passed === true;
      await record(passed, code, {
        status: result.status,
        tests: result.tests.map((t) => ({ name: t.name, passed: t.passed })),
      });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  async function runCode() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("run");
    try {
      const lines = drill.type === "program" && stdin.length > 0 ? stdin.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n") : null;
      const result = await getPythonRuntime().run(isPredict ? drill.starterCode : code, {
        stdin: lines,
        packages: drill.packages,
        timeoutMs: drill.timeoutMs + 1000,
      });
      setRunResult(result);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function reset() {
    setCode(drill.starterCode);
    setCheck({ kind: "idle" });
    setRunResult(null);
  }

  const allPassed =
    (check.kind === "tests" && check.result.status === "ok" && check.result.passed === true) ||
    (check.kind === "predict" && check.correct);
  const checkLabel = loading ? "Loading Python…" : busy === "check" ? "Checking…" : isPredict ? "Check answer" : "Run tests";
  // Predict drills show the real output only once solved or after enough tries
  const canRunPredict = !isPredict || solved || solution !== null;

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
        <PythonEditor
          value={code}
          onChange={setCode}
          storageKey={`drill-${drill.id}`}
          onRun={() => void runCheck()}
          height="420px"
        />
      )}

      {drill.type === "program" && (
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
          <Button variant="ghost" size="sm" onClick={reset} disabled={code === drill.starterCode}>
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {loading
            ? runtimeText || "The first run downloads Python (a few seconds)"
            : runtimeText && runtimeStatus === "busy"
              ? runtimeText
              : `${attempts} ${attempts === 1 ? "attempt" : "attempts"}${solved ? " · solved" : ""}`}
        </span>
      </div>

      <div aria-live="polite" className={cn("flex flex-col gap-4 transition-opacity", busy && "opacity-60")}>
        {check.kind === "tests" && <TestResults result={check.result} />}
        {check.kind === "predict" &&
          (check.correct ? (
            <div className="rounded-md border border-success/35 bg-success/6 p-4">
              <p className="font-semibold text-success">That's exactly what it prints.</p>
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
        {runResult && <RunOutput result={runResult} />}
      </div>

      {allPassed && (
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
                  Read it, close it, then write it yourself from memory. That's where it sticks.
                </p>
              )}
              <PythonEditor value={solution} onChange={() => {}} readOnly height="300px" />
            </div>
          )}
        </section>
      )}

      <nav className="flex items-center justify-between gap-3 border-t border-border pt-4 text-sm" aria-label="Drills">
        {drill.previous ? (
          <Link href={`/exercises/${drill.previous.id}`} className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{drill.previous.title}</span>
          </Link>
        ) : (
          <Link href={`/lessons/${drill.lesson.id}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            The lesson
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
    />
  );

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        <Confetti active={confetti} particleCount={70} duration={2800} />
      </div>
      {levelUp !== null && <LevelUpNotification level={levelUp} onDismiss={() => setLevelUp(null)} />}
      {achievements.length > 0 && <AchievementNotificationQueue achievements={achievements} />}

      <div className="hidden lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
        <div className="sticky top-24 max-h-[calc(100dvh-8rem)] self-start overflow-y-auto pr-1">{prompt}</div>
        <div>{workspace}</div>
      </div>
      <div className="lg:hidden">
        <Tabs defaultValue="task">
          <TabsList className="w-full">
            <TabsTrigger value="task" className="flex-1">
              Task
            </TabsTrigger>
            <TabsTrigger value="code" className="flex-1">
              {isPredict ? "Answer" : "Code"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="task" className="mt-4">
            {prompt}
          </TabsContent>
          <TabsContent value="code" className="mt-4">
            {workspace}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
