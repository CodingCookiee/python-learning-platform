"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Play, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seal } from "@/components/brand/seal";
import { Sensei } from "@/components/quest/sensei";
import { getPythonRuntime, useRuntimeStatus } from "@/lib/python-runtime";
import {
  BROKEN_CODE,
  checkFix,
  errorLine,
  EXPECTED,
  isStartFailure,
  STEP1_CODE,
  TRY_IT_LINES,
  type FixResult,
} from "@/lib/landing/try-it";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Run a line", line: TRY_IT_LINES.run },
  { title: "Fix a bug", line: TRY_IT_LINES.fix },
  { title: "Earn a stripe", line: TRY_IT_LINES.stripe },
] as const;

/** What the broken line does, for when Python can't start in this browser */
const BROKEN_ERROR = "SyntaxError: unterminated string literal (detected at line 1)";

type Shown = { kind: "printed" | "error"; text: string } | null;
type Ran = { output: string; error: string | null } | "unavailable";

async function runPython(code: string): Promise<Ran> {
  const result = await getPythonRuntime().run(code, { timeoutMs: 8000 });
  if (result.error && isStartFailure(result.error)) return "unavailable";
  const output = result.stdout + (result.stderr ? `\n${result.stderr}` : "");
  const error = result.error ? result.error.traceback || `${result.error.type}: ${result.error.message}` : null;
  return { output, error };
}

function shown(ran: { output: string; error: string | null }): Shown {
  if (ran.error) return { kind: "error", text: errorLine(ran.error) };
  return { kind: "printed", text: ran.output.replace(/\n$/, "") || "(nothing)" };
}

/**
 * The landing page's "Try it": run a line, fix a bug, earn a stripe, in about three minutes and
 * with no account (docs/superpowers/specs/2026-10-08-landing-how-it-works-design.md). Python starts
 * downloading on the first pointer, touch or focus inside the frame; if it can't start, each step
 * shows what it would have printed. A pass calls `onPass`, which presses a stripe onto the belt
 * ladder under the hero.
 */
export function TryIt({ onPass }: { onPass?: () => void }) {
  const { status } = useRuntimeStatus();
  const loading = status === "loading";
  const [step, setStep] = React.useState(0);
  const [unavailable, setUnavailable] = React.useState(false);
  const [busy, setBusy] = React.useState<"line" | "run" | "test" | null>(null);
  const [first, setFirst] = React.useState<Shown>(null);
  const [code, setCode] = React.useState(BROKEN_CODE);
  const [second, setSecond] = React.useState<Shown>(null);
  const [test, setTest] = React.useState<FixResult | null>(null);
  const [passed, setPassed] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const warmed = React.useRef(false);
  const headingRef = React.useRef<HTMLParagraphElement>(null);
  const moveFocus = React.useRef(false);

  // Keyboard and screen reader users land on the new step's heading when they move between steps
  React.useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    headingRef.current?.focus();
  }, [step]);

  function warmUp() {
    if (warmed.current) return;
    warmed.current = true;
    getPythonRuntime().preload();
  }

  function go(next: number) {
    moveFocus.current = true;
    setStep(next);
  }

  async function attempt(kind: "line" | "run" | "test", source: string): Promise<Ran | null> {
    if (busy) return null;
    setBusy(kind);
    try {
      const ran = unavailable ? "unavailable" : await runPython(source);
      if (ran === "unavailable") setUnavailable(true);
      return ran;
    } finally {
      setBusy(null);
    }
  }

  async function runLine() {
    const ran = await attempt("line", STEP1_CODE);
    if (!ran) return;
    const next: Shown = ran === "unavailable" ? { kind: "printed", text: "Hello!" } : shown(ran);
    setFirst(next);
    setAnnouncement(next ? `${next.kind === "error" ? "Error" : "Printed"}: ${next.text}` : "");
  }

  async function runCode() {
    const ran = await attempt("run", code);
    if (!ran) return;
    const next: Shown =
      ran === "unavailable"
        ? code === BROKEN_CODE
          ? { kind: "error", text: BROKEN_ERROR }
          : null
        : shown(ran);
    setSecond(next);
    setAnnouncement(next ? `${next.kind === "error" ? "Error" : "Printed"}: ${next.text}` : "");
  }

  async function runTests() {
    const ran = await attempt("test", code);
    if (!ran || ran === "unavailable") return;
    const result = checkFix(ran);
    setTest(result);
    setSecond(shown(ran));
    if (!result.passed) {
      setAnnouncement(`Test failed. ${result.reason}`);
      return;
    }
    setAnnouncement("Test passed. Stripe earned.");
    if (!passed) {
      setPassed(true);
      onPass?.();
      // Long enough to see the pass before the frame moves on
      window.setTimeout(() => setStep(2), 1200);
    }
  }

  function reset() {
    setCode(BROKEN_CODE);
    setSecond(null);
    setTest(null);
  }

  const canLeaveFix = passed || unavailable;
  const runLabel = loading ? "Loading Python…" : "Run";

  return (
    <section
      aria-labelledby="try-it-heading"
      onPointerEnter={warmUp}
      onTouchStart={warmUp}
      onFocus={warmUp}
      className="relative flex flex-col rounded-md border border-border bg-sheet"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <h2 id="try-it-heading" className="text-base font-semibold">
          Try it
        </h2>
        <ol className="flex items-center gap-1" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => go(i)}
                disabled={i === 2 && !canLeaveFix}
                aria-current={i === step ? "step" : undefined}
                aria-label={`Step ${i + 1} of 3: ${s.title}`}
                className="flex size-6 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5 rotate-45 border border-(--keyline)",
                    i === step ? "bg-primary" : i < step || (i === 2 && passed) ? "bg-(--keyline)/50" : "bg-transparent"
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-start gap-3 px-5 pt-4">
        <Sensei head mood={step === 2 && passed ? "pleased" : "calm"} className="mt-0.5 size-9" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p ref={headingRef} tabIndex={-1} className="text-sm font-semibold outline-none">
            Step {step + 1} of 3 · {STEPS[step]!.title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {step === 2 && !passed ? TRY_IT_LINES.stripeUnearned : STEPS[step]!.line}
          </p>
        </div>
      </div>

      {unavailable && (
        <p className="mx-5 mt-3 rounded-sm border border-border bg-background px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Python couldn&apos;t start in this browser (offline, or blocked), so each step shows what it would print.
        </p>
      )}

      {/* A steady height on wider screens, so the frame doesn't jump between steps */}
      <div className="flex flex-col gap-3 px-5 py-4 sm:min-h-60">
        {step === 0 && (
          <div className="overflow-hidden rounded-sm border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border py-1.5 pr-1.5 pl-3">
              <span className="font-condensed text-xs font-semibold text-muted-foreground">python</span>
              <Button size="xs" onClick={() => void runLine()} aria-busy={busy === "line" || loading} className="min-w-20">
                {busy === "line" || loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
                {runLabel}
              </Button>
            </div>
            <pre className="px-3 py-2 font-mono text-[0.8125rem] leading-6">{STEP1_CODE}</pre>
            <Output value={first} />
          </div>
        )}

        {step === 1 && (
          <>
            <div className="overflow-hidden rounded-sm border border-border bg-background">
              <label htmlFor="try-it-code" className="sr-only">
                The line to fix
              </label>
              <textarea
                id="try-it-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void runTests();
                  }
                }}
                rows={2}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className="block w-full resize-none overflow-x-auto bg-transparent px-3 py-2 font-mono text-[0.8125rem] leading-6 whitespace-pre text-foreground outline-none focus-visible:bg-accent/40"
              />
              <Output value={second} />
            </div>
            {test && (
              <p
                className={cn(
                  "flex items-start gap-2 rounded-sm border px-3 py-2 text-sm",
                  test.passed ? "border-success/35 bg-success/6" : "border-border bg-background"
                )}
              >
                {test.passed ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span>
                  <span className="font-semibold">Prints &ldquo;{EXPECTED}&rdquo;</span>
                  {test.passed ? (
                    <span className="text-success-ink"> · passed</span>
                  ) : (
                    <span className="block text-muted-foreground">{test.reason}</span>
                  )}
                </span>
              </p>
            )}
            {unavailable && (
              <p className="text-sm text-muted-foreground">
                With the quote added, it prints <span className="font-mono text-foreground">{EXPECTED}</span>.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => void runTests()} aria-busy={busy === "test" || loading} disabled={unavailable}>
                {busy === "test" || loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                {loading ? "Loading Python…" : "Run tests"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void runCode()} aria-busy={busy === "run"}>
                <Play aria-hidden="true" />
                Run
              </Button>
              <Button size="sm" variant="ghost" onClick={reset} disabled={code === BROKEN_CODE && !test && !second}>
                <RotateCcw aria-hidden="true" />
                Reset
              </Button>
              <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter runs the tests</span>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="flex items-center gap-5">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
              <p className="font-condensed text-3xl leading-none font-extrabold tracking-[-0.01em]">Make it count</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {passed
                  ? "That stripe is on the belt below. With an account every stripe you earn is kept, and the white belt starts with this same loop: read, run, fix, pass."
                  : "That's the loop every lesson follows: read, run, fix, pass. With an account every stripe you earn is kept."}
              </p>
              <Button asChild>
                <Link href="/auth/signup">
                  Sign up free
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            {passed && <Seal label="Passed" detail="Drill 1" animate className="hidden shrink-0 sm:inline-flex" />}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <Button variant="ghost" size="sm" onClick={() => go(step - 1)} disabled={step === 0}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        {step < 2 && (
          <Button variant="outline" size="sm" onClick={() => go(step + 1)} disabled={step === 1 && !canLeaveFix}>
            Next
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

function Output({ value }: { value: Shown }) {
  if (!value) return null;
  return (
    <div
      className={cn(
        "border-t border-border px-3 py-2 font-mono text-[0.8125rem] leading-6",
        value.kind === "error" ? "bg-destructive/6 text-destructive" : "bg-accent/35"
      )}
    >
      <span className="mb-0.5 block font-sans text-xs font-semibold text-muted-foreground">
        {value.kind === "error" ? "Error" : "Printed"}
      </span>
      <pre className="whitespace-pre-wrap">{value.text}</pre>
    </div>
  );
}
