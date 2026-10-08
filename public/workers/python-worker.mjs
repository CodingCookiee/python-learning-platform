/* pylearn Python worker.
 *
 * A module worker that owns one Pyodide instance off the main thread, so a runaway loop can never
 * freeze the page: the main thread terminates this worker on timeout and
 * starts a fresh one (lib/python-runtime.ts).
 *
 * Protocol
 *   main → worker  { id, kind: "run", code, stdin, packages, scanImports, files }
 *                  { id, kind: "test", solution, tests, importSolution, packages, files, mainName }
 *   (files: a multi-file drill's other files, path -> source)
 *   worker → main  { type: "ready" }
 *                  { type: "status", text }                 (loading progress)
 *                  { id, type: "running" }                  (packages loaded, code starting)
 *                  { id, type: "result", result }           (plp_runner JSON)
 *                  { id, type: "failure", message }         (the runtime itself failed)
 */

// A module worker: Pyodide 314's classic build can't be loaded with importScripts
// in Chrome workers, but its ES module build imports cleanly.
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";

const INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

const loaded = new Set();

// Dependencies Pyodide's lockfile leaves out
const EXTRA_DEPS = { mypy: ["typing-extensions", "micropip"] };
// Pure-Python wheels installed from PyPI with micropip after the Pyodide packages load
const PYPI_DEPS = { mypy: ["mypy_extensions", "pathspec"] };

async function installPypiDeps(py, packages) {
  const extra = [...new Set((packages ?? []).flatMap((p) => PYPI_DEPS[p] ?? []))].filter((p) => !loaded.has(`pypi:${p}`));
  if (extra.length === 0) return;
  self.postMessage({ type: "status", text: `Installing ${extra.join(", ")}…` });
  py.globals.set("_plp_pypi", JSON.stringify(extra));
  await py.runPythonAsync("import json, micropip\nawait micropip.install(json.loads(_plp_pypi))");
  extra.forEach((p) => loaded.add(`pypi:${p}`));
}
const withExtras = (packages) => [...new Set((packages ?? []).flatMap((p) => [p, ...(EXTRA_DEPS[p] ?? [])]))];
// Stdlib modules whose data ships as a separate Pyodide package
const IMPLICIT = [[/\bzoneinfo\b/, "tzdata"]];
const implicitPackages = (msg) => {
  const text = [msg.code, msg.solution, msg.tests, msg.scanImports, ...Object.values(msg.files ?? {})].filter(Boolean).join("\n");
  return IMPLICIT.filter(([pattern]) => pattern.test(text)).map(([, pkg]) => pkg);
};


const ready = (async () => {
  const py = await loadPyodide({ indexURL: INDEX_URL });
  // Downloaded and compiled; what's left is the test harness (the page says "Downloading Python…" until now)
  self.postMessage({ type: "status", text: "Starting Python…" });
  const version = new URL(self.location.href).searchParams.get("v") ?? "";
  const files = ["plp.py", "plp_runner.py", "plp_fakes.py"];
  const sources = await Promise.all(
    files.map((name) =>
      fetch(`/py/${name}?v=${version}`).then((res) => {
        if (!res.ok) throw new Error(`Couldn't load ${name} (${res.status})`);
        return res.text();
      })
    )
  );
  py.FS.mkdirTree("/home/pyodide/_plp");
  files.forEach((name, i) => py.FS.writeFile(`/home/pyodide/_plp/${name}`, sources[i]));
  py.runPython("import sys\nsys.path.insert(0, '/home/pyodide/_plp')\nimport plp_runner");
  return py;
})();

ready.then(
  () => self.postMessage({ type: "ready" }),
  (err) => self.postMessage({ type: "failure", message: String(err?.message ?? err) })
);

async function loadPackages(py, packages) {
  const wanted = withExtras(packages).filter((p) => !loaded.has(p));
  if (wanted.length === 0) return;
  self.postMessage({ type: "status", text: `Loading ${wanted.join(", ")}…` });
  const failed = [];
  await py.loadPackage(wanted, {
    messageCallback: () => {},
    errorCallback: (msg) => failed.push(msg),
  });
  if (failed.length > 0) throw new Error(`Couldn't load ${wanted.join(", ")}`);
  wanted.forEach((p) => loaded.add(p));
  await installPypiDeps(py, packages);
}

/**
 * After a job: collect what it left behind, then freeze everything still alive, so later collections
 * (drills and pytest both call gc.collect()) only walk what the next job makes, not a heap of every
 * package imported so far. Runs synchronously, between jobs, outside any time limit.
 */
function settle(py) {
  try {
    py.runPython("import gc as _gc\n_gc.collect()\n_gc.freeze()");
  } catch {
    // A crashed instance can't settle; it's being replaced anyway
  }
}

self.onmessage = async (event) => {
  const msg = event.data;
  try {
    const py = await ready;
    await loadPackages(py, [...(msg.packages ?? []), ...implicitPackages(msg)]);
    // Lesson examples load whatever Pyodide packages they import (numpy, pandas…)
    if (msg.scanImports) {
      await py.loadPackagesFromImports(msg.scanImports, {
        messageCallback: (text) => {
          if (text.startsWith("Loading")) self.postMessage({ type: "status", text });
        },
        errorCallback: () => {},
      });
    }
    // Packages are in: the job's own time limit starts now (downloads don't count)
    self.postMessage({ id: msg.id, type: "running" });
    const args =
      msg.kind === "test"
        ? {
            solution: msg.solution,
            tests: msg.tests,
            import_solution: msg.importSolution ?? true,
            files: msg.files ?? null,
            main_name: msg.mainName ?? "solution.py",
          }
        : { code: msg.code, stdin: msg.stdin ?? null, files: msg.files ?? null };
    py.globals.set("_plp_args", JSON.stringify(args));
    const fn = msg.kind === "test" ? "run_tests" : "run_code";
    const json = await py.runPythonAsync(
      `import json as _json\n_plp_runner = __import__("plp_runner")\n_plp_runner.to_json(await _plp_runner.${fn}(**_json.loads(_plp_args)))`
    );
    self.postMessage({ id: msg.id, type: "result", result: JSON.parse(json) });
    settle(py);
  } catch (err) {
    // A Pyodide fatal error (or any call after one) means this instance is finished: say so,
    // so the page starts a fresh worker instead of sending it the next run
    const message = String(err?.message ?? err);
    const fatal = Boolean(err?.pyodide_fatal_error) || /fatally failed/i.test(message);
    self.postMessage({ id: msg.id, type: "failure", message, fatal });
  }
};
