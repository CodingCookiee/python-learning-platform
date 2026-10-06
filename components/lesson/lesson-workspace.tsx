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


const OPEN_KEY = "pylearn:scratchpad-open";

/** Block elements that can hold the reader's place while the column reflows */
const ANCHORS = "h1, h2, h3, h4, p, li, pre, table, blockquote, figure, details";
/** Below the sticky navbar: the first element reaching past this line is what's being read */
const READING_LINE = 80;

interface ReadingPlace {
  el: Element;
  top: number;
}

/**
 * The first few blocks of the lesson text that start on screen, and where each sits: what's
 * being read, rather than the tail of a block scrolled almost out of view. The inline table of
 * contents ([data-toc]) doesn't count: it's navigation, and it hides when the pane closes. More
 * than one block, in case the first is gone after the reflow; the first one still showing is
 * the one put back. When no block starts on screen (a long code block fills it), the one
 * reaching into view stands in.
 */
function readingPlaces(root: HTMLElement | null): ReadingPlace[] {
  const places: ReadingPlace[] = [];
  let reachingIn: ReadingPlace | null = null;
  if (!root) return places;
  for (const el of root.querySelectorAll(ANCHORS)) {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0 || rect.bottom <= READING_LINE || el.closest("[data-toc]")) continue;
    if (rect.top >= READING_LINE) places.push({ el, top: rect.top });
    else reachingIn ??= { el, top: rect.top };
    if (places.length === 4 || rect.top > window.innerHeight) break;
  }
  return places.length > 0 ? places : reachingIn ? [reachingIn] : [];
}

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
  const lessonRef = React.useRef<HTMLDivElement>(null);
  const placesRef = React.useRef<ReadingPlace[]>([]);

  // Opening or closing the pane changes the lesson's width (and folds its side table of
  // contents in or out), so the text reflows. Put what was being read back where it was.
  React.useLayoutEffect(() => {
    const places = placesRef.current;
    placesRef.current = [];
    for (const place of places) {
      if (!place.el.isConnected) continue;
      const rect = place.el.getBoundingClientRect();
      if (rect.height === 0) continue;
      const moved = rect.top - place.top;
      if (Math.abs(moved) >= 1) window.scrollBy({ top: moved, behavior: "instant" });
      return;
    }
  }, [open]);

  // Remember whether the pane was open, across lessons
  const toggle = React.useCallback((next: boolean) => {
    placesRef.current = readingPlaces(lessonRef.current);
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
        <div ref={lessonRef} className="min-w-0">
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
