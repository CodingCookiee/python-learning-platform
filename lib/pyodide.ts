import { useState, useRef, useCallback } from "react";

// ── Pyodide CDN types ────────────────────────────────────────────────────────
declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
  globals: { get(name: string): unknown };
}

// ── Module-level singleton ────────────────────────────────────────────────────
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/";
const PYODIDE_SCRIPT = `${PYODIDE_CDN}pyodide.js`;

let pyodideInstance: PyodideInterface | null = null;
let pyodideLoadPromise: Promise<PyodideInterface> | null = null;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadPromise) return pyodideLoadPromise;

  pyodideLoadPromise = (async () => {
    await injectScript(PYODIDE_SCRIPT);

    if (!window.loadPyodide) {
      throw new Error("window.loadPyodide not available after script load");
    }

    const instance = await window.loadPyodide({ indexURL: PYODIDE_CDN });
    pyodideInstance = instance;
    return instance;
  })();

  return pyodideLoadPromise;
}

// ── Capture-stdout wrapper ────────────────────────────────────────────────────
const STDOUT_SETUP = `
import sys as _sys, io as _io
_stdout_capture = _io.StringIO()
_sys.stdout = _stdout_capture
`;

const STDOUT_TEARDOWN = `
_sys.stdout = _sys.__stdout__
_captured_output = _stdout_capture.getvalue()
`;

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface PyodideRunResult {
  output: string;
  error: string | null;
}

export interface UsePyodideReturn {
  run: (code: string, timeoutMs?: number) => Promise<PyodideRunResult>;
  loading: boolean;
  ready: boolean;
}

export function usePyodide(): UsePyodideReturn {
  const [loading, setLoading] = useState(false);
  // Initialize ready directly from the singleton — no effect needed
  const [ready, setReady] = useState(() => pyodideInstance !== null);
  const startedRef = useRef(false);

  const run = useCallback(async (code: string, timeoutMs = 10000): Promise<PyodideRunResult> => {
    try {
      let py = pyodideInstance;

      if (!py) {
        if (!startedRef.current) {
          startedRef.current = true;
          setLoading(true);
        }
        py = await loadPyodide();
        setReady(true);
        setLoading(false);
      }

      const wrappedCode = `${STDOUT_SETUP}\n${code}\n${STDOUT_TEARDOWN}`;

      // Race execution against a timeout to handle infinite loops
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Execution timed out after ${timeoutMs / 1000}s`)),
          timeoutMs
        )
      );

      await Promise.race([py.runPythonAsync(wrappedCode), timeoutPromise]);

      const captured = py.globals.get("_captured_output");
      const output = typeof captured === "string" ? captured : "";

      return { output, error: null };
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      return { output: "", error: message };
    }
  }, []);

  return { run, loading, ready };
}
