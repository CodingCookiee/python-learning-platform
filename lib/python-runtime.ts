"use client";

import { useSyncExternalStore } from "react";

/**
 * The browser Python runtime: Pyodide in a Web Worker (public/workers/python-worker.js)
 * running the shared plp harness (public/py). One job runs at a time. A job that
 * overruns its timeout terminates the worker, and the next job starts a fresh one.
 */

export interface PyError {
  type: string;
  message: string;
  line: number | null;
  traceback: string;
}

export interface RunResult {
  status: "ok" | "error" | "timeout";
  stdout: string;
  stderr: string;
  error: PyError | null;
  durationMs: number;
}

export interface TestOutcome {
  name: string;
  hidden: boolean;
  passed: boolean;
  message: string | null;
  error: PyError | null;
  stdout: string;
  durationMs: number;
}

export interface TestRunResult {
  status: "ok" | "error" | "timeout";
  /** Where an error came from: the learner's code or the drill's tests */
  phase: "solution" | "tests";
  stdout: string;
  error: PyError | null;
  tests: TestOutcome[];
  passed?: boolean;
  durationMs: number;
}

export type RuntimeStatus = "idle" | "loading" | "ready" | "busy";

interface Job {
  id: number;
  message: Record<string, unknown>;
  timeoutMs: number;
  resolve: (value: unknown) => void;
}

const WORKER_URL = "/workers/python-worker.js?v=314.0.7-1";

class PythonRuntime {
  private worker: Worker | null = null;
  private workerReady: Promise<void> | null = null;
  private queue: Job[] = [];
  private active: Job | null = null;
  private nextId = 1;
  private status: RuntimeStatus = "idle";
  private statusText = "";
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getStatus = () => this.status;
  getStatusText = () => this.statusText;

  private setStatus(status: RuntimeStatus, text = "") {
    this.status = status;
    this.statusText = text;
    this.listeners.forEach((l) => l());
  }

  /** Start loading Python ahead of the first run (e.g. when an editor mounts). */
  preload() {
    void this.ensureWorker().catch(() => {});
  }

  private ensureWorker(): Promise<void> {
    if (this.workerReady) return this.workerReady;
    this.setStatus("loading", "Loading Python…");
    const worker = new Worker(WORKER_URL);
    this.worker = worker;
    this.workerReady = new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent) => {
        const data = event.data as { type: string; id?: number; text?: string; message?: string; result?: unknown };
        if (data.type === "ready") {
          this.setStatus(this.active ? "busy" : "ready");
          resolve();
          return;
        }
        if (data.type === "status") {
          this.setStatus(this.status, data.text ?? "");
          return;
        }
        if (data.type === "failure" && data.id === undefined) {
          this.reset();
          this.setStatus("idle");
          reject(new Error(data.message ?? "Python failed to load"));
          return;
        }
        if (this.active && data.id === this.active.id) {
          this.finish(
            data.type === "result"
              ? data.result
              : { __failure: data.message ?? "Python stopped unexpectedly" }
          );
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        const message = event.message || "Python failed to load";
        if (this.active) this.finish({ __failure: message });
        this.reset();
        this.setStatus("idle");
        reject(new Error(message));
      };
    });
    return this.workerReady;
  }

  private reset() {
    this.worker?.terminate();
    this.worker = null;
    this.workerReady = null;
  }

  private timer: ReturnType<typeof setTimeout> | null = null;

  private finish(value: unknown) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const job = this.active;
    this.active = null;
    job?.resolve(value);
    this.pump();
  }

  private pump() {
    if (this.active) return;
    if (this.queue.length === 0) {
      this.setStatus(this.workerReady ? "ready" : "idle");
      return;
    }
    const job = this.queue.shift()!;
    this.active = job;
    this.ensureWorker().then(
      () => {
        if (this.active !== job) return;
        this.setStatus("busy");
        // The clock starts once Python is loaded, so a slow first load isn't a timeout
        this.timer = setTimeout(() => {
          if (this.active !== job) return;
          this.reset();
          this.finish({ __timeout: true });
        }, job.timeoutMs);
        this.worker!.postMessage({ id: job.id, ...job.message });
      },
      (err: Error) => {
        if (this.active === job) this.finish({ __failure: err.message });
      }
    );
  }

  private enqueue(message: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    return new Promise((resolve) => {
      this.queue.push({ id: this.nextId++, message, timeoutMs, resolve });
      this.pump();
    });
  }

  async run(
    code: string,
    options: {
      stdin?: string[] | null;
      packages?: string[];
      /** Source to scan for imports of Pyodide packages, which are then loaded */
      scanImports?: string;
      timeoutMs?: number;
    } = {}
  ): Promise<RunResult> {
    const timeoutMs = options.timeoutMs ?? 10_000;
    const raw = await this.enqueue(
      {
        kind: "run",
        code,
        stdin: options.stdin ?? null,
        packages: options.packages ?? [],
        scanImports: options.scanImports ?? null,
      },
      timeoutMs
    );
    return normaliseRun(raw, timeoutMs);
  }

  async test(
    solution: string,
    tests: string,
    options: { packages?: string[]; timeoutMs?: number; importSolution?: boolean } = {}
  ): Promise<TestRunResult> {
    const timeoutMs = options.timeoutMs ?? 10_000;
    const raw = await this.enqueue(
      {
        kind: "test",
        solution,
        tests,
        importSolution: options.importSolution ?? true,
        packages: options.packages ?? [],
      },
      timeoutMs
    );
    return normaliseTest(raw, timeoutMs);
  }
}

function timeoutError(timeoutMs: number): PyError {
  const seconds = Math.round(timeoutMs / 100) / 10;
  return {
    type: "Timeout",
    message: `Stopped after ${seconds}s. Look for a loop that never ends, or input() waiting for a line.`,
    line: null,
    traceback: "",
  };
}

function failureError(message: string): PyError {
  return { type: "RuntimeError", message, line: null, traceback: message };
}

function normaliseRun(raw: unknown, timeoutMs: number): RunResult {
  const r = raw as Record<string, unknown>;
  if (r.__timeout) {
    return { status: "timeout", stdout: "", stderr: "", error: timeoutError(timeoutMs), durationMs: timeoutMs };
  }
  if (typeof r.__failure === "string") {
    return { status: "error", stdout: "", stderr: "", error: failureError(r.__failure), durationMs: 0 };
  }
  return raw as RunResult;
}

function normaliseTest(raw: unknown, timeoutMs: number): TestRunResult {
  const r = raw as Record<string, unknown>;
  if (r.__timeout) {
    return {
      status: "timeout",
      phase: "solution",
      stdout: "",
      error: timeoutError(timeoutMs),
      tests: [],
      durationMs: timeoutMs,
    };
  }
  if (typeof r.__failure === "string") {
    return {
      status: "error",
      phase: "tests",
      stdout: "",
      error: failureError(r.__failure),
      tests: [],
      durationMs: 0,
    };
  }
  return raw as TestRunResult;
}

let runtime: PythonRuntime | null = null;

/** The page-wide runtime (created on first use, in the browser only). */
export function getPythonRuntime(): PythonRuntime {
  if (typeof window === "undefined") {
    throw new Error("The Python runtime only exists in the browser");
  }
  runtime ??= new PythonRuntime();
  return runtime;
}

const noopSubscribe = () => () => {};

/** Loading/busy state of the runtime, for buttons and status lines. */
export function useRuntimeStatus(): { status: RuntimeStatus; text: string } {
  const rt = typeof window === "undefined" ? null : getPythonRuntime();
  const status = useSyncExternalStore(
    rt?.subscribe ?? noopSubscribe,
    () => rt?.getStatus() ?? "idle",
    () => "idle" as RuntimeStatus
  );
  const text = useSyncExternalStore(
    rt?.subscribe ?? noopSubscribe,
    () => rt?.getStatusText() ?? "",
    () => ""
  );
  return { status, text };
}
