"use client";

import * as React from "react";
import { LoaderCircle, PanelRightClose, PanelRightOpen, Play, SquareTerminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PythonEditor } from "@/components/lesson/monaco-editor";
import { ExampleOutput, runExample, type RunState } from "@/components/lesson/code-block";
import { ScratchpadContext, type Scratchpad } from "@/components/lesson/scratchpad-context";
import { getPythonRuntime } from "@/lib/python-runtime";
import { usePyodide } from "@/lib/pyodide";
import { cn } from "@/lib/utils";

/**
 * The lesson's split view: the lesson on the left, a scratchpad editor on the
 * right that stays put while you read. Any runnable example can be sent to it
 * ("Scratchpad" on the code block) to take apart and extend. The scratchpad is
 * saved per lesson in the browser.
 */


const OPEN_KEY = "pylearn:scratchpad-open";

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function LessonWorkspace({ lessonId, children }: { lessonId: string; children: React.ReactNode }) {
  // null until the learner toggles it: then the remembered choice (read after hydration) applies
  const [chosen, setOpen] = React.useState<boolean | null>(null);
  const remembered = React.useSyncExternalStore(
    () => () => {},
    readOpen,
    () => false
  );
  const open = chosen ?? remembered;
  const [code, setCode] = React.useState("# Try things here while you read.\n");
  const codeRef = React.useRef(code);
  const [editorKey, setEditorKey] = React.useState(0);
  const [result, setResult] = React.useState<RunState | null>(null);
  const { run: runPython } = usePyodide();
  const [running, setRunning] = React.useState(false);

  // Remember whether the pane was open, across lessons
  const toggle = React.useCallback((next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {
      // Not remembered; that's fine
    }
    if (next) getPythonRuntime().preload();
  }, []);

  const update = React.useCallback((next: string) => {
    codeRef.current = next;
    setCode(next);
  }, []);

  const scratchpad = React.useMemo<Scratchpad>(
    () => ({
      load: (snippet: string) => {
        codeRef.current = snippet;
        setCode(snippet);
        // Remount the editor so it shows the new code rather than its saved copy
        try {
          localStorage.setItem(`scratch-${lessonId}`, snippet);
          localStorage.setItem(`scratch-${lessonId}:t`, String(Date.now()));
        } catch {
          // The editor still shows it
        }
        setEditorKey((k) => k + 1);
        setResult(null);
        toggle(true);
      },
      open,
    }),
    [lessonId, toggle, open]
  );

  async function run() {
    if (running) return;
    setRunning(true);
    try {
      setResult(await runExample(runPython, codeRef.current, 10_000));
    } finally {
      setRunning(false);
    }
  }

  return (
    <ScratchpadContext.Provider value={scratchpad}>
      <div className={cn("grid min-w-0 gap-8", open && "xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]")}>
        <div className="min-w-0">
          <div className="mb-6 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => toggle(!open)} aria-expanded={open} aria-controls="scratchpad">
              {open ? <PanelRightClose aria-hidden="true" /> : <PanelRightOpen aria-hidden="true" />}
              {open ? "Close scratchpad" : "Open scratchpad"}
            </Button>
          </div>
          {children}
        </div>

        {open && (
          <aside
            id="scratchpad"
            aria-label="Scratchpad"
            className="fixed inset-x-0 bottom-0 z-40 flex max-h-[62dvh] flex-col border-t border-border bg-background shadow-lg xl:sticky xl:top-24 xl:z-auto xl:max-h-[calc(100dvh-8rem)] xl:self-start xl:rounded-md xl:border xl:shadow-none"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <SquareTerminal className="size-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">Scratchpad</span>
              <span className="text-xs text-muted-foreground">Ctrl+Enter runs</span>
              <Button size="xs" className="ml-auto" onClick={() => void run()} aria-busy={running}>
                {running ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Play aria-hidden="true" />}
                Run
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={() => toggle(false)} aria-label="Close scratchpad">
                <PanelRightClose aria-hidden="true" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <PythonEditor key={editorKey} value={code} onChange={update} storageKey={`scratch-${lessonId}`} onRun={() => void run()} height="min(40dvh, 380px)" />
            </div>
            {result && <ExampleOutput result={result} className="max-h-48 overflow-auto px-3 py-2" />}
          </aside>
        )}
      </div>
    </ScratchpadContext.Provider>
  );
}
