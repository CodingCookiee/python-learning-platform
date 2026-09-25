"use client";

import * as React from "react";
import { Check, Copy, LoaderCircle, Pencil, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePyodide } from "@/lib/pyodide";
import { isBrowserRunnable } from "@/lib/content/runnable";

type RunState = {
  status: "idle" | "running" | "ok" | "error";
  output: string;
  values: Array<[string, string]>;
};

const SHOW_MARKER = "__PYLEARN_SHOW__";

/**
 * Run an example like the Python REPL: in a fresh namespace, then report the
 * value of a final expression, or the variables a final assignment or method
 * call changed (so `fruits.append("x")` shows `fruits`).
 */
const HARNESS = String.raw`
import ast as _a, json as _j, inspect as _i
_tree = _a.parse(_src)
_ns = {"__name__": "__main__"}
_body = _tree.body
_last = _body[-1] if _body else None
_tail_expr = isinstance(_last, _a.Expr)
_r = eval(compile(_a.Module(body=_body[:-1] if _tail_expr else _body, type_ignores=[]), "example.py", "exec", flags=_a.PyCF_ALLOW_TOP_LEVEL_AWAIT), _ns)
if _i.iscoroutine(_r):
    await _r
def _base(node):
    while isinstance(node, (_a.Subscript, _a.Attribute)):
        node = node.value
    return [node.id] if isinstance(node, _a.Name) else []
# Names the example assigns or mutates at the top level, in order
_names = []
for _st in _body:
    _targets = []
    if isinstance(_st, _a.Assign):
        _targets = _st.targets
    elif isinstance(_st, (_a.AugAssign, _a.AnnAssign)):
        _targets = [_st.target]
    elif isinstance(_st, _a.Expr) and isinstance(_st.value, _a.Call) and isinstance(_st.value.func, _a.Attribute):
        _targets = [_st.value.func.value]
    for _t in _targets:
        for _e in (_t.elts if isinstance(_t, (_a.Tuple, _a.List)) else [_t]):
            for _n in _base(_e):
                if _n not in _names:
                    _names.append(_n)
_show = [[_n, repr(_ns[_n])] for _n in _names if _n in _ns][:8]
if _tail_expr:
    _value = eval(compile(_a.Expression(_last.value), "example.py", "eval", flags=_a.PyCF_ALLOW_TOP_LEVEL_AWAIT), _ns)
    if _i.iscoroutine(_value):
        _value = await _value
    if _value is not None:
        _show.append(["", repr(_value)])
print("\n__PYLEARN_SHOW__" + _j.dumps(_show))
`;

function buildExampleHarness(code: string): string {
  return `_src = ${JSON.stringify(code)}\n${HARNESS}`;
}

export function CodeBlock({
  code,
  language,
  norun = false,
  children,
}: {
  code: string;
  language: string;
  /** Author opted out of the Run button (```python norun) */
  norun?: boolean;
  /** The highlighted <code> element for display */
  children: React.ReactNode;
}) {
  const runnable = language === "python" && !norun && isBrowserRunnable(code);
  const { run, loading } = usePyodide();
  const [copied, setCopied] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(code);
  const [result, setResult] = React.useState<RunState>({ status: "idle", output: "", values: [] });
  const runningRef = React.useRef(false);

  async function copy() {
    await navigator.clipboard.writeText(editing ? draft : code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function execute() {
    if (runningRef.current) return;
    runningRef.current = true;
    setResult((r) => ({ ...r, status: "running" }));
    const source = editing ? draft : code;
    const { output, error } = await run(buildExampleHarness(source), 8000, { scanImports: source });
    if (error) {
      // The last line of a traceback is the part that names the problem
      const message = error.trim().split("\n").filter(Boolean).at(-1) ?? error;
      setResult({ status: "error", output: message, values: [] });
    } else {
      const idx = output.lastIndexOf(SHOW_MARKER);
      const printed = idx >= 0 ? output.slice(0, idx) : output;
      let values: Array<[string, string]> = [];
      try {
        values = idx >= 0 ? JSON.parse(output.slice(idx + SHOW_MARKER.length)) : [];
      } catch {
        values = [];
      }
      setResult({ status: "ok", output: printed.replace(/\n$/, ""), values });
    }
    runningRef.current = false;
  }

  const busy = loading || result.status === "running";
  const lines = draft.split("\n").length;

  return (
    <div className="my-6 overflow-hidden rounded-md border border-border bg-sheet">
      <div className="flex items-center gap-1 border-b border-border py-1 pr-1.5 pl-4">
        <span className="font-condensed text-xs font-semibold text-muted-foreground select-none">
          {language || "text"}
          {runnable && !editing && <span className="ml-2 font-normal">· runs in your browser</span>}
          {editing && <span className="ml-2 font-normal">· editing</span>}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {runnable && (
            <>
              {editing ? (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setDraft(code);
                    setEditing(false);
                  }}
                >
                  <RotateCcw aria-hidden="true" />
                  Reset
                </Button>
              ) : (
                <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
              )}
              <Button size="xs" onClick={() => void execute()} aria-busy={busy} className="min-w-20">
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : (
                  <Play aria-hidden="true" />
                )}
                {loading ? "Loading…" : "Run"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => void copy()}
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </Button>
        </span>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void execute();
            }
          }}
          spellCheck={false}
          rows={lines}
          aria-label="Edit this example"
          className="block w-full resize-none overflow-x-auto bg-transparent px-4 py-3 font-mono text-[0.875rem] leading-6 whitespace-pre text-foreground outline-none"
        />
      ) : (
        <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.875rem] leading-6">{children}</pre>
      )}

      {result.status !== "idle" && (
        <div
          aria-live="polite"
          className={cn(
            "border-t border-border px-4 py-3 font-mono text-[0.8125rem] leading-6 transition-opacity",
            result.status === "running" && "opacity-55",
            result.status === "error" ? "bg-destructive/6 text-destructive" : "bg-accent/35"
          )}
        >
          {(result.status === "error" || result.output.trim() !== "") && (
            <>
              <span className="mb-1 block font-sans text-xs font-semibold text-muted-foreground">
                {result.status === "error" ? "Error" : "Printed"}
              </span>
              <pre className="whitespace-pre-wrap">{result.output.trimEnd()}</pre>
            </>
          )}
          {result.values.length > 0 && (
            <div className={cn(result.output.trim() !== "" && "mt-3")}>
              <span className="mb-1 block font-sans text-xs font-semibold text-muted-foreground">
                {result.values.length === 1 && result.values[0]![0] === "" ? "Value" : "Afterwards"}
              </span>
              <dl className="flex flex-col gap-0.5">
                {result.values.map(([name, value], i) => (
                  <div key={name || i} className="flex gap-2">
                    {name && <dt className="shrink-0 text-(--code-attr)">{name} =</dt>}
                    <dd className="min-w-0 break-all whitespace-pre-wrap">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {result.status === "ok" && result.output.trim() === "" && result.values.length === 0 && (
            <span className="text-muted-foreground">Ran without printing anything.</span>
          )}
        </div>
      )}
    </div>
  );
}
