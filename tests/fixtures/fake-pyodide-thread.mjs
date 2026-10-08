// A stand-in for scripts/content/pyodide-thread.mjs in the pool's tests: no Python, just the
// message protocol. A job's `behaviour` says what to do:
//   "ok"          answer with this thread's id and how many jobs it has run
//   "fatal"       report a Pyodide fatal error, every time
//   "fatal-once"  report a fatal error the first time any thread sees it (marked in `root`)
import { parentPort, threadId, workerData } from "node:worker_threads";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

let ran = 0;
parentPort.postMessage({ type: "ready" });
parentPort.on("message", (msg) => {
  ran += 1;
  parentPort.postMessage({ id: msg.id, type: "running" });
  const marker = path.join(workerData.root, `fatal-once-${msg.tag}`);
  const fatal = msg.behaviour === "fatal" || (msg.behaviour === "fatal-once" && !existsSync(marker));
  if (msg.behaviour === "fatal-once" && fatal) writeFileSync(marker, "1");
  if (fatal) {
    parentPort.postMessage({ id: msg.id, type: "failure", message: "Maximum call stack size exceeded", fatal: true });
    return;
  }
  parentPort.postMessage({ id: msg.id, type: "result", result: { thread: threadId, ran } });
});
