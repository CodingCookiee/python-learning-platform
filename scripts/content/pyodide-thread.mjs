// One Pyodide instance in a worker thread, running the same plp harness as the
// browser worker (public/workers/python-worker.js). Driven by pyodide-pool.mjs.

import { parentPort, workerData } from "node:worker_threads";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadPyodide } from "pyodide";

const { root } = workerData;
const loaded = new Set();

// Dependencies Pyodide's lockfile leaves out
const EXTRA_DEPS = { mypy: ["typing-extensions", "micropip"] };
// Pure-Python wheels installed from PyPI with micropip after the Pyodide packages load
const PYPI_DEPS = { mypy: ["mypy_extensions", "pathspec"] };

async function installPypiDeps(py, packages) {
  const extra = [...new Set((packages ?? []).flatMap((p) => PYPI_DEPS[p] ?? []))].filter((p) => !loaded.has(`pypi:${p}`));
  if (extra.length === 0) return;
  py.globals.set("_plp_pypi", JSON.stringify(extra));
  await py.runPythonAsync("import json, micropip\nawait micropip.install(json.loads(_plp_pypi))");
  extra.forEach((p) => loaded.add(`pypi:${p}`));
}
const withExtras = (packages) => [...new Set((packages ?? []).flatMap((p) => [p, ...(EXTRA_DEPS[p] ?? [])]))];


const ready = (async () => {
  const py = await loadPyodide({
    packageCacheDir: path.join(root, ".cache", "pyodide"),
    stdout: () => {},
    stderr: () => {},
  });
  py.FS.mkdirTree("/home/pyodide/_plp");
  for (const name of ["plp.py", "plp_runner.py"]) {
    py.FS.writeFile(`/home/pyodide/_plp/${name}`, readFileSync(path.join(root, "public", "py", name), "utf8"));
  }
  py.runPython("import sys\nsys.path.insert(0, '/home/pyodide/_plp')\nimport plp_runner");
  return py;
})();

ready.then(
  () => parentPort.postMessage({ type: "ready" }),
  (err) => parentPort.postMessage({ type: "failure", message: String(err?.message ?? err) })
);

parentPort.on("message", async (msg) => {
  try {
    const py = await ready;
    const wanted = withExtras(msg.packages).filter((p) => !loaded.has(p));
    if (wanted.length > 0) {
      const failed = [];
      await py.loadPackage(wanted, { messageCallback: () => {}, errorCallback: (m) => failed.push(m) });
      if (failed.length > 0) throw new Error(`Couldn't load ${wanted.join(", ")}: ${failed[0]}`);
      wanted.forEach((p) => loaded.add(p));
    }
    await installPypiDeps(py, msg.packages);
    if (msg.scanImports) {
      await py.loadPackagesFromImports(msg.scanImports, { messageCallback: () => {}, errorCallback: () => {} });
    }
    const args =
      msg.kind === "test"
        ? { solution: msg.solution, tests: msg.tests, import_solution: msg.importSolution ?? true }
        : { code: msg.code, stdin: msg.stdin ?? null };
    py.globals.set("_plp_args", JSON.stringify(args));
    const fn = msg.kind === "test" ? "run_tests" : "run_code";
    const json = await py.runPythonAsync(
      `import json as _json\n_plp_runner = __import__("plp_runner")\n_plp_runner.to_json(await _plp_runner.${fn}(**_json.loads(_plp_args)))`
    );
    parentPort.postMessage({ id: msg.id, type: "result", result: JSON.parse(json) });
  } catch (err) {
    parentPort.postMessage({ id: msg.id, type: "failure", message: String(err?.message ?? err) });
  }
});
