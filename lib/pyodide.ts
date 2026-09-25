"use client";

import { useCallback } from "react";
import { getPythonRuntime, useRuntimeStatus } from "@/lib/python-runtime";

/**
 * Simple "run this code, give me its output" hook over the worker runtime
 * (lib/python-runtime.ts). Every run gets a fresh namespace and a real timeout.
 */

export interface PyodideRunResult {
  output: string;
  /** Traceback text, or null when the code ran cleanly */
  error: string | null;
}

export interface RunOptions {
  /** Source to scan for package imports (numpy, pandas…) to load before running */
  scanImports?: string;
  stdin?: string[] | null;
}

export interface UsePyodideReturn {
  run: (code: string, timeoutMs?: number, options?: RunOptions) => Promise<PyodideRunResult>;
  loading: boolean;
  ready: boolean;
}

export function usePyodide(): UsePyodideReturn {
  const { status } = useRuntimeStatus();

  const run = useCallback(
    async (code: string, timeoutMs = 10_000, options: RunOptions = {}): Promise<PyodideRunResult> => {
      const result = await getPythonRuntime().run(code, { timeoutMs, ...options });
      const output = result.stdout + (result.stderr ? `\n${result.stderr}` : "");
      if (!result.error) return { output, error: null };
      const error = result.error.traceback || `${result.error.type}: ${result.error.message}`;
      return { output, error };
    },
    []
  );

  return { run, loading: status === "loading", ready: status === "ready" || status === "busy" };
}
