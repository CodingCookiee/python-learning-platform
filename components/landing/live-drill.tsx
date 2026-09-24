"use client";

import * as React from "react";
import Link from "next/link";
import { Check, X, Circle, RotateCcw, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Seal } from "@/components/brand/seal";
import { usePyodide } from "@/lib/pyodide";
import { cn } from "@/lib/utils";

const STARTER = `def greet(name):
    # Return a greeting, e.g. "Hello, Raza!"
    pass
`;

const CASES: Array<{ arg: string; expected: string }> = [
  { arg: "Raza", expected: "Hello, Raza!" },
  { arg: "Ada", expected: "Hello, Ada!" },
  { arg: "Grace Hopper", expected: "Hello, Grace Hopper!" },
];

const MARKER = "__PYLEARN_RESULT__";

type CaseResult = { passed: boolean; got: string };
type Status = "idle" | "running" | "passed" | "failed" | "error";

function buildHarness(code: string): string {
  const cases = JSON.stringify(CASES.map((c) => [c.arg, c.expected]));
  // User code runs in a fresh namespace; results come back as one JSON line.
  return `
import json as _json
_ns = {}
_payload = {"error": None, "cases": []}
try:
    exec(compile(${JSON.stringify(code)}, "drill.py", "exec"), _ns)
    _fn = _ns.get("greet")
    if not callable(_fn):
        _payload["error"] = "NameError: define a function called greet(name)"
    else:
        for _arg, _expected in _json.loads(${JSON.stringify(cases)}):
            try:
                _got = _fn(_arg)
                _payload["cases"].append({"passed": _got == _expected, "got": repr(_got)})
            except Exception as _e:
                _payload["cases"].append({"passed": False, "got": f"{type(_e).__name__}: {_e}"})
except SyntaxError as _e:
    _payload["error"] = f"SyntaxError on line {_e.lineno}: {_e.msg}"
except Exception as _e:
    _payload["error"] = f"{type(_e).__name__}: {_e}"
print("${MARKER}" + _json.dumps(_payload))
`;
}

export function LiveDrill({ onPass }: { onPass?: () => void }) {
  const { run, loading } = usePyodide();
  const [code, setCode] = React.useState(STARTER);
  const [status, setStatus] = React.useState<Status>("idle");
  const [results, setResults] = React.useState<CaseResult[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const passedOnce = React.useRef(false);
  const lines = code.split("\n").length;

  async function submit() {
    if (status === "running") return;
    setStatus("running");
    setError(null);

    const { output, error: runError } = await run(buildHarness(code), 8000);
    const line = output
      .split("\n")
      .reverse()
      .find((l) => l.startsWith(MARKER));

    if (runError || !line) {
      setResults(null);
      setError(runError ?? "Something went wrong running your code.");
      setStatus("error");
      return;
    }

    const payload = JSON.parse(line.slice(MARKER.length)) as {
      error: string | null;
      cases: CaseResult[];
    };
    if (payload.error) {
      setResults(null);
      setError(payload.error);
      setStatus("error");
      return;
    }

    setResults(payload.cases);
    const allPassed = payload.cases.every((c) => c.passed);
    setStatus(allPassed ? "passed" : "failed");
    if (allPassed && !passedOnce.current) {
      passedOnce.current = true;
      onPass?.();
    }
  }

  function reset() {
    setCode(STARTER);
    setStatus("idle");
    setResults(null);
    setError(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
      return;
    }
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart, selectionEnd } = el;
      const next = code.slice(0, selectionStart) + "    " + code.slice(selectionEnd);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + 4;
      });
    }
  }

  const busy = status === "running" || loading;

  return (
    <div className="relative rounded-md border border-border bg-sheet">
      {/* Task */}
      <div className="flex flex-col gap-1 border-b border-border px-5 pt-4 pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold">Your first drill</h2>
          <span className="font-condensed text-xs font-semibold text-muted-foreground">
            White belt · graded in your browser
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Make <code className="font-mono text-[0.8125rem] text-foreground">greet(name)</code>{" "}
          return a greeting for any name.
        </p>
      </div>

      {/* Editor on a strict cell grid */}
      <div className="relative flex min-w-0 font-mono text-[0.8125rem] leading-6">
        <div
          className="tabular select-none border-r border-border py-3 pr-3 pl-4 text-right text-muted-foreground/70"
          aria-hidden="true"
        >
          {Array.from({ length: Math.max(lines, 4) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <label htmlFor="drill-code" className="sr-only">
          Python code for the drill
        </label>
        <textarea
          id="drill-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={Math.max(lines, 4)}
          className="block w-full min-w-0 resize-none overflow-x-auto overflow-y-hidden bg-transparent py-3 pr-4 pl-3 whitespace-pre text-foreground outline-none focus-visible:bg-accent/40"
        />
      </div>

      {/* Test cases */}
      <ul className="flex flex-col border-t border-border" aria-live="polite">
        {CASES.map((c, i) => {
          const r = results?.[i];
          return (
            <li
              key={c.arg}
              className="flex items-center gap-3 border-b border-border/70 px-5 py-2 font-mono text-[0.8125rem] last:border-b-0"
            >
              {r ? (
                r.passed ? (
                  <Check className="size-4 shrink-0 text-success" aria-label="Passed" />
                ) : (
                  <X className="size-4 shrink-0 text-destructive" aria-label="Failed" />
                )
              ) : (
                <Circle className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
              )}
              <span className="min-w-0 truncate">
                greet(<span className="text-(--code-string)">&quot;{c.arg}&quot;</span>)
              </span>
              <span className="ml-auto flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                {r && !r.passed ? (
                  <span className="truncate text-destructive">got {r.got}</span>
                ) : (
                  <span className="truncate">&quot;{c.expected}&quot;</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="border-t border-border px-5 py-3 font-mono text-[0.8125rem] text-destructive">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
        <Button onClick={() => void submit()} disabled={busy}>
          {busy && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {loading ? "Loading Python…" : status === "running" ? "Grading…" : "Submit drill"}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} disabled={busy || code === STARTER}>
          <RotateCcw aria-hidden="true" />
          Reset
        </Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
          {loading ? "The first run downloads Python (a few seconds)" : "Ctrl + Enter to submit"}
        </span>
      </div>

      {status === "passed" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-accent/50 px-5 py-4">
          <p className="text-sm">
            <span className="font-semibold">Stripe earned.</span>{" "}
            <Link href="/auth/signup" className="text-primary underline">
              Create an account
            </Link>{" "}
            to keep it and start the white belt syllabus.
          </p>
        </div>
      )}

      {status === "passed" && (
        <Seal
          label="Passed"
          detail="Drill 1"
          animate
          className={cn("pointer-events-none absolute -top-5 right-5 bg-sheet")}
        />
      )}
    </div>
  );
}
