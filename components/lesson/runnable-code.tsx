"use client";

import * as React from "react";
import { Play, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/animations";
import { usePyodide } from "@/lib/pyodide";

export interface RunnableCodeProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

type RunStatus = "idle" | "running" | "success" | "error";

export function RunnableCode({
  code: initialCode,
  language = "python",
  title,
  className,
}: RunnableCodeProps) {
  const { run, loading: pyodideLoading, ready } = usePyodide();

  const [code, setCode] = React.useState(initialCode);
  const [status, setStatus] = React.useState<RunStatus>("idle");
  const [output, setOutput] = React.useState<string>("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [code]);

  async function handleRun() {
    setStatus("running");
    setOutput("");
    setErrorMsg(null);

    const result = await run(code);

    if (result.error !== null) {
      setErrorMsg(result.error);
      setStatus("error");
    } else {
      setOutput(result.output);
      setStatus("success");
    }
  }

  function handleReset() {
    setCode(initialCode);
    setStatus("idle");
    setOutput("");
    setErrorMsg(null);
  }

  const isDirty = code !== initialCode;
  const isRunDisabled = status === "running" || pyodideLoading;

  return (
    <div
      className={cn(
        "relative border border-border bg-card ring-1 ring-foreground/5 flex flex-col",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-heading text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            {language}
          </span>
          {title && <span className="text-xs text-muted-foreground">&mdash; {title}</span>}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleReset}
              aria-label="Reset to original code"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
            </Button>
          )}
          <Button
            size="xs"
            onClick={handleRun}
            disabled={isRunDisabled}
            className="flex items-center gap-1.5"
          >
            {status === "running" || pyodideLoading ? (
              <Spinner size="sm" className="size-3" aria-hidden="true" />
            ) : (
              <Play className="size-3" aria-hidden="true" />
            )}
            {pyodideLoading ? "Loading Python..." : status === "running" ? "Running..." : "Run"}
          </Button>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-label="Editable code example"
          className={cn(
            "w-full resize-none bg-muted/30 p-4 font-mono text-sm text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            "min-h-[100px] leading-relaxed"
          )}
        />
      </div>

      <AnimatePresence>
        {(status === "success" || status === "error") && (
          <motion.div
            key="output-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "border-t",
                status === "error" ? "border-destructive/30" : "border-border"
              )}
            >
              <pre
                aria-live="polite"
                className={cn(
                  "p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap",
                  status === "success"
                    ? "text-foreground bg-emerald-500/5"
                    : "text-destructive bg-destructive/5"
                )}
              >
                {status === "error" ? errorMsg : output || "\u00a0"}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {status === "success" && (
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

      {ready && (
        <span className="sr-only" aria-live="polite">
          Python environment ready
        </span>
      )}
    </div>
  );
}
