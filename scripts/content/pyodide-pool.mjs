// A pool of Pyodide worker threads for running drills in Node (content:validate,
// and later server-side grading). A job that overruns its timeout terminates its
// thread; a fresh one replaces it.

import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import os from "node:os";

const THREAD = fileURLToPath(new URL("./pyodide-thread.mjs", import.meta.url));

export class PyodidePool {
  constructor({
    root,
    size = Number(process.env.PLP_POOL_SIZE) || Math.max(1, Math.min(4, os.cpus().length - 1)),
  }) {
    this.root = root;
    this.size = size;
    this.idle = [];
    this.queue = [];
    this.threads = new Set();
    this.nextId = 1;
    this.closed = false;
  }

  spawn() {
    const worker = new Worker(THREAD, { workerData: { root: this.root } });
    const slot = { worker, job: null, timer: null, ready: false };
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
      if (slot.job && msg.id === slot.job.id) {
        const job = slot.job;
        clearTimeout(slot.timer);
        slot.job = null;
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

  release(slot) {
    if (this.closed) return;
    const job = this.queue.shift();
    if (!job) {
      this.idle.push(slot);
      return;
    }
    this.start(slot, job);
  }

  start(slot, job) {
    slot.job = job;
    slot.timer = setTimeout(() => {
      // Runaway code: kill the thread, report a timeout, start a replacement
      this.threads.delete(slot);
      slot.job = null;
      void slot.worker.terminate();
      job.resolve({ __timeout: true });
      if (!this.closed) this.fill();
    }, job.timeoutMs);
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
