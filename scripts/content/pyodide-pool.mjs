// A pool of Pyodide worker threads for running drills in Node (content:validate,
// and later server-side grading). A job that overruns its timeout terminates its
// thread; a fresh one replaces it.
//
// A long-lived interpreter piles up state from every drill it ran, and a full garbage
// collection over a heap like that can overflow Pyodide's stack, a fatal error that
// leaves the instance unusable. So each thread retires after `maxJobs` jobs, and a job
// that hits a fatal error gets one more go on a fresh thread: the learner's code
// didn't fail, the interpreter did.

import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import os from "node:os";

const THREAD = fileURLToPath(new URL("./pyodide-thread.mjs", import.meta.url));

export class PyodidePool {
  constructor({
    root,
    size = Number(process.env.PLP_POOL_SIZE) || Math.max(1, Math.min(4, os.cpus().length - 1)),
    // Where downloaded Pyodide packages are cached (a writable dir; /tmp on serverless hosts)
    cacheDir = undefined,
    // Jobs a thread runs before a fresh one replaces it
    maxJobs = Number(process.env.PLP_MAX_JOBS) || 500,
    // The thread script (tests swap in a fake)
    thread = THREAD,
  }) {
    this.root = root;
    this.cacheDir = cacheDir;
    this.size = size;
    this.maxJobs = maxJobs;
    this.thread = thread;
    this.idle = [];
    this.queue = [];
    this.threads = new Set();
    this.nextId = 1;
    this.closed = false;
  }

  spawn() {
    const worker = new Worker(this.thread, { workerData: { root: this.root, cacheDir: this.cacheDir } });
    const slot = { worker, job: null, timer: null, ready: false, jobs: 0 };
    this.threads.add(slot);
    worker.on("message", (msg) => {
      if (msg.type === "ready") {
        slot.ready = true;
        this.release(slot);
        return;
      }
      if (msg.type === "failure" && msg.id === undefined) {
        this.fail(slot, new Error(`Pyodide failed to start: ${msg.message}`));
        return;
      }
      if (msg.type === "running") {
        // Packages loaded: the job's own time limit starts now
        if (slot.job && msg.id === slot.job.id) this.arm(slot, slot.job, slot.job.timeoutMs);
        return;
      }
      if (slot.job && msg.id === slot.job.id) {
        const job = slot.job;
        clearTimeout(slot.timer);
        slot.job = null;
        if (msg.type === "failure" && msg.fatal) {
          // The interpreter crashed: replace it, and run the job once more on a fresh one
          this.retire(slot);
          if (job.retried) job.resolve({ __failure: msg.message });
          else {
            job.retried = true;
            const idle = this.idle.pop();
            if (idle) this.start(idle, job);
            else this.queue.unshift(job);
          }
          if (!this.closed) this.fill();
          return;
        }
        job.resolve(msg.type === "result" ? msg.result : { __failure: msg.message });
        this.release(slot);
      }
    });
    worker.on("error", (err) => this.fail(slot, err));
    return slot;
  }

  fail(slot, err) {
    this.threads.delete(slot);
    const message = String(err?.message ?? err);
    if (slot.job) {
      clearTimeout(slot.timer);
      slot.job.resolve({ __failure: message });
      slot.job = null;
    }
    void slot.worker.terminate();
    // A thread that dies before it's ready will keep dying: fail the queue instead of looping
    if (!slot.ready) {
      this.startFailures = (this.startFailures ?? 0) + 1;
      if (this.startFailures >= 3) {
        for (const job of this.queue.splice(0)) job.resolve({ __failure: `Pyodide thread won't start: ${message}` });
        return;
      }
    }
    if (!this.closed) this.fill();
  }

  /** Take a thread out of service; `fill` starts its replacement */
  retire(slot) {
    this.threads.delete(slot);
    this.idle = this.idle.filter((s) => s !== slot);
    void slot.worker.terminate();
  }

  release(slot) {
    if (this.closed) return;
    if (slot.jobs >= this.maxJobs) {
      // Worn: a fresh thread takes over before the heap grows any further
      this.retire(slot);
      this.fill();
      return;
    }
    const job = this.queue.shift();
    if (!job) {
      this.idle.push(slot);
      return;
    }
    this.start(slot, job);
  }

  arm(slot, job, ms) {
    clearTimeout(slot.timer);
    slot.timer = setTimeout(() => {
      // Runaway code: kill the thread, report a timeout, start a replacement
      this.threads.delete(slot);
      slot.job = null;
      void slot.worker.terminate();
      job.resolve({ __timeout: true });
      if (!this.closed) this.fill();
    }, ms);
  }

  start(slot, job) {
    slot.job = job;
    slot.jobs += 1;
    // Package downloads get their own generous window; the job's limit starts on "running"
    this.arm(slot, job, Math.max(job.timeoutMs, 120_000));
    slot.worker.postMessage({ id: job.id, ...job.message });
  }

  fill() {
    while (this.threads.size < this.size) this.spawn();
  }

  run(message, timeoutMs) {
    this.fill();
    return new Promise((resolve) => {
      const job = { id: this.nextId++, message, timeoutMs, resolve };
      const slot = this.idle.pop();
      if (slot) this.start(slot, job);
      else this.queue.push(job);
    });
  }

  async close() {
    this.closed = true;
    await Promise.all([...this.threads].map((s) => s.worker.terminate()));
    this.threads.clear();
  }
}
