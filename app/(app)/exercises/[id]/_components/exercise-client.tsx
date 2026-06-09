"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { Play, CheckCircle2, XCircle, ChevronDown, ChevronUp, Lightbulb, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PythonEditor } from "@/components/lesson";
import { AchievementNotificationQueue, Confetti } from "@/components/gamification";
import { Spinner } from "@/components/animations";
import { usePyodide } from "@/lib/pyodide";
import type { UnlockedAchievement } from "@/lib/achievements";

// Types

export interface TestCase {
  input?: string;
  expected: string;
  description: string;
}

export interface TestResult {
  description: string;
  passed: boolean;
  actual: string;
  expected: string;
  error: string | null;
}

export interface ExerciseData {
  id: string;
  title: string;
  description: string;
  instructions: string;
  starterCode: string;
  testCases: TestCase[];
  hints: string[];
  difficulty: string;
  xpReward: number;
  lesson: { id: string; title: string; moduleId: string };
  solution: string | null;
  submissions: Array<{
    id: string;
    passed: boolean;
    attempts: number;
    hintsUsed: number;
    submittedAt: string;
  }>;
  stats: { attempts: number; solved: boolean; hintsAvailable: number };
}

// Helpers

function getDifficultyBadgeClass(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "easy":
      return "border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
    case "medium":
      return "border-yellow-500/30 text-yellow-600 dark:text-yellow-400";
    case "hard":
      return "border-red-500/30 text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

// Test runner

async function runTests(
  code: string,
  testCases: TestCase[],
  pyRun: (code: string) => Promise<{ output: string; error: string | null }>
): Promise<TestResult[]> {
  const result = await pyRun(code);
  return testCases.map((tc) => ({
    description: tc.description,
    passed: result.error === null && result.output.trim() === tc.expected.trim(),
    actual: result.output,
    expected: tc.expected,
    error: result.error,
  }));
}

// Left panel: Instructions

function InstructionsPanel({
  exercise,
  testResults,
}: {
  exercise: ExerciseData;
  testResults: TestResult[] | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={getDifficultyBadgeClass(exercise.difficulty)}
            aria-label={`Difficulty: ${exercise.difficulty}`}
          >
            {exercise.difficulty}
          </Badge>
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-muted-foreground"
            aria-label={`${exercise.xpReward} XP reward`}
          >
            <Zap className="size-3" aria-hidden="true" />
            {exercise.xpReward} XP
          </Badge>
        </div>
        <h1 className="font-heading text-xl font-semibold sm:text-2xl">{exercise.title}</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{exercise.instructions}</ReactMarkdown>
      </div>

      {exercise.testCases.length > 0 && (
        <section aria-labelledby="test-cases-heading">
          <h2
            id="test-cases-heading"
            className="mb-3 font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground"
          >
            Test Cases ({exercise.testCases.length})
          </h2>
          <ul className="flex flex-col gap-2" role="list">
            {exercise.testCases.map((tc, i) => {
              const result = testResults?.[i] ?? null;
              return (
                <li
                  key={i}
                  className="flex flex-col gap-1 border border-border bg-card p-3"
                  aria-label={`Test case ${i + 1}: ${tc.description}`}
                >
                  <div className="flex items-start gap-2">
                    {result !== null ? (
                      result.passed ? (
                        <CheckCircle2
                          className="mt-0.5 size-4 shrink-0 text-emerald-500"
                          aria-label="Passed"
                        />
                      ) : (
                        <XCircle
                          className="mt-0.5 size-4 shrink-0 text-red-500"
                          aria-label="Failed"
                        />
                      )
                    ) : (
                      <div
                        className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-muted-foreground/30"
                        aria-hidden="true"
                      />
                    )}
                    <span className="flex-1 text-sm font-medium">{tc.description}</span>
                  </div>
                  <p className="pl-6 text-xs text-muted-foreground">
                    Expected:{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono">{tc.expected}</code>
                  </p>
                  {result !== null && !result.passed && result.actual && (
                    <p className="pl-6 text-xs text-red-600 dark:text-red-400">
                      Got:{" "}
                      <code className="rounded bg-muted px-1 py-0.5 font-mono">
                        {result.actual.trim() || "(empty)"}
                      </code>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

// Right panel: Editor + Output

interface EditorPanelProps {
  exercise: ExerciseData;
  code: string;
  setCode: (v: string) => void;
  onRun: () => void;
  isRunning: boolean;
  pyodideLoading: boolean;
  testResults: TestResult[] | null;
  attempts: number;
  solved: boolean;
  hintsUsed: number;
  onHintReveal: () => void;
  achievements: UnlockedAchievement[];
}

function EditorPanel({
  exercise,
  code,
  setCode,
  onRun,
  isRunning,
  pyodideLoading,
  testResults,
  attempts,
  solved,
  hintsUsed,
  onHintReveal,
  achievements,
}: EditorPanelProps) {
  const [solutionVisible, setSolutionVisible] = React.useState(false);

  const passedCount = testResults?.filter((r) => r.passed).length ?? 0;
  const totalCount = exercise.testCases.length;
  const hasError = testResults?.some((r) => r.error !== null) ?? false;
  const allPassed =
    testResults !== null && passedCount === totalCount && totalCount > 0 && !hasError;

  const runButtonLabel = pyodideLoading
    ? "Loading Python..."
    : isRunning
      ? "Running..."
      : "Run & Test";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <PythonEditor
          value={code}
          onChange={setCode}
          storageKey={`exercise-${exercise.id}`}
          onRun={onRun}
          height="400px"
        />
        <AnimatePresence>
          {allPassed && (
            <motion.div
              key="success-flash"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="pointer-events-none absolute inset-0 bg-emerald-400/10"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onRun}
          disabled={isRunning || pyodideLoading}
          className="flex items-center gap-2"
          aria-label={runButtonLabel}
        >
          {isRunning || pyodideLoading ? (
            <Spinner size="sm" className="size-3.5" aria-hidden="true" />
          ) : (
            <Play className="size-3.5" aria-hidden="true" />
          )}
          {runButtonLabel}
        </Button>

        <Badge
          variant="outline"
          className="text-muted-foreground"
          aria-label={`${attempts} attempt${attempts !== 1 ? "s" : ""}`}
        >
          {attempts} attempt{attempts !== 1 ? "s" : ""}
        </Badge>

        {solved && (
          <Badge
            className="flex items-center gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            variant="outline"
          >
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Solved
          </Badge>
        )}
      </div>

      <AnimatePresence>
        {testResults !== null && (
          <motion.div
            key="output-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={`border ${allPassed ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"} p-4`}
              aria-live="polite"
              role="status"
            >
              <p
                className={`mb-3 font-heading text-sm font-semibold ${allPassed ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
              >
                {allPassed ? "✓ " : ""}
                {passedCount}/{totalCount} tests passed
              </p>

              <ul className="flex flex-col gap-1.5" role="list">
                {testResults.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    {r.passed ? (
                      <CheckCircle2
                        className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                        aria-label="Passed"
                      />
                    ) : (
                      <XCircle
                        className="mt-0.5 size-3.5 shrink-0 text-red-500"
                        aria-label="Failed"
                      />
                    )}
                    <span
                      className={r.passed ? "text-foreground" : "text-red-600 dark:text-red-400"}
                    >
                      {r.description}
                    </span>
                  </li>
                ))}
              </ul>

              {hasError && testResults[0]?.error && (
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded bg-destructive/10 p-3 font-mono text-xs text-destructive">
                  {testResults[0].error}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {exercise.hints.length > 0 && (
        <section aria-labelledby="hints-heading" className="border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-yellow-500" aria-hidden="true" />
            <h2
              id="hints-heading"
              className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground"
            >
              Hints
            </h2>
          </div>

          {hintsUsed > 0 && (
            <ul className="mt-3 flex flex-col gap-2" role="list">
              {exercise.hints.slice(0, hintsUsed).map((hint, i) => (
                <li key={i} className="text-sm text-foreground">
                  <span className="mr-1.5 font-semibold text-muted-foreground">#{i + 1}</span>
                  {hint}
                </li>
              ))}
            </ul>
          )}

          {hintsUsed < exercise.hints.length ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onHintReveal}
              className="mt-3"
              aria-label="Reveal next hint"
            >
              Show Hint {hintsUsed + 1} of {exercise.hints.length}
            </Button>
          ) : hintsUsed > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No more hints available.</p>
          ) : null}
        </section>
      )}

      {exercise.solution !== null && (
        <section aria-labelledby="solution-heading" className="border border-border">
          <button
            id="solution-heading"
            onClick={() => setSolutionVisible((v) => !v)}
            aria-expanded={solutionVisible}
            className="flex w-full items-center justify-between px-4 py-3 text-left font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>View Solution</span>
            {solutionVisible ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4" aria-hidden="true" />
            )}
          </button>
          <AnimatePresence>
            {solutionVisible && (
              <motion.div
                key="solution"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="border-t border-border">
                  <PythonEditor
                    value={exercise.solution}
                    onChange={() => {}}
                    readOnly
                    height="300px"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {achievements.length > 0 && <AchievementNotificationQueue achievements={achievements} />}
    </div>
  );
}

// Main client component

export interface ExerciseClientProps {
  exercise: ExerciseData;
}

export function ExerciseClient({ exercise }: ExerciseClientProps) {
  const { run, loading: pyodideLoading } = usePyodide();

  const [code, setCode] = React.useState(exercise.starterCode);
  const [isRunning, setIsRunning] = React.useState(false);
  const [testResults, setTestResults] = React.useState<TestResult[] | null>(null);
  const [attempts, setAttempts] = React.useState(exercise.stats.attempts);
  const [solved, setSolved] = React.useState(exercise.stats.solved);
  const [hintsUsed, setHintsUsed] = React.useState(0);
  const [achievements, setAchievements] = React.useState<UnlockedAchievement[]>([]);
  const [showConfetti, setShowConfetti] = React.useState(false);

  async function handleRun() {
    if (isRunning) return;
    setIsRunning(true);

    try {
      // Client-side syntax check: run a compile-only snippet first
      const syntaxCheck = await run(
        `
import ast as _ast
try:
    _ast.parse(${JSON.stringify("<<CODE>>")}.replace("<<CODE>>", ${JSON.stringify("__code__")}))
    print("ok")
except SyntaxError as e:
    print(f"SyntaxError: {e}")
`
          .replace("<<CODE>>", "")
          .replace("__code__", "__placeholder__")
      );

      // Actually do the syntax check by running the user code through ast.parse
      const syntaxResult = await run(
        `import ast as _ast\ntry:\n    _ast.parse(${JSON.stringify("x")})\n    print("ok")\nexcept SyntaxError as e:\n    print(f"SyntaxError: {e}")`.replace(
          JSON.stringify("x"),
          JSON.stringify(code)
        )
      );
      if (syntaxResult.output.startsWith("SyntaxError")) {
        setTestResults([
          {
            description: "Syntax check",
            passed: false,
            actual: syntaxResult.output,
            expected: "Valid Python syntax",
            error: syntaxResult.output,
          },
        ]);
        return;
      }

      const results = await runTests(code, exercise.testCases, run);
      setTestResults(results);

      const allPassed = results.every((r) => r.passed) && results.length > 0;

      const res = await fetch(`/api/exercises/${exercise.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          passed: allPassed,
          testResults: JSON.stringify(results),
          hintsUsed,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          success: boolean;
          submission: { id: string; passed: boolean; attempts: number; hintsUsed: number };
          xpGained: number;
          newlySolved: boolean;
          achievements: UnlockedAchievement[];
        };

        setAttempts(data.submission.attempts);
        if (data.submission.passed) {
          setSolved(true);
        }
        // Confetti on first solve
        if (data.newlySolved) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3500);
        }
        if (data.achievements.length > 0) {
          setAchievements(data.achievements);
        }
      }
    } finally {
      setIsRunning(false);
    }
  }

  function handleHintReveal() {
    setHintsUsed((prev) => Math.min(prev + 1, exercise.hints.length));
  }

  return (
    <>
      {" "}
      {/* Confetti burst on first solve */}
      <div className="relative overflow-hidden pointer-events-none fixed inset-0 z-50">
        <Confetti active={showConfetti} particleCount={80} duration={3000} />
      </div>
      <div className="hidden lg:grid lg:grid-cols-5 lg:gap-8" aria-label="Exercise workspace">
        <div className="lg:col-span-2">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
            <InstructionsPanel exercise={exercise} testResults={testResults} />
          </div>
        </div>

        <div className="lg:col-span-3">
          <EditorPanel
            exercise={exercise}
            code={code}
            setCode={setCode}
            onRun={handleRun}
            isRunning={isRunning}
            pyodideLoading={pyodideLoading}
            testResults={testResults}
            attempts={attempts}
            solved={solved}
            hintsUsed={hintsUsed}
            onHintReveal={handleHintReveal}
            achievements={achievements}
          />
        </div>
      </div>
      <div className="lg:hidden">
        <Tabs defaultValue="instructions">
          <TabsList className="w-full">
            <TabsTrigger value="instructions" className="flex-1">
              Instructions
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex-1">
              Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instructions" className="mt-4">
            <InstructionsPanel exercise={exercise} testResults={testResults} />
          </TabsContent>

          <TabsContent value="editor" className="mt-4">
            <EditorPanel
              exercise={exercise}
              code={code}
              setCode={setCode}
              onRun={handleRun}
              isRunning={isRunning}
              pyodideLoading={pyodideLoading}
              testResults={testResults}
              attempts={attempts}
              solved={solved}
              hintsUsed={hintsUsed}
              onHintReveal={handleHintReveal}
              achievements={achievements}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
