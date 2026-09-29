(async () => {
  const out = [];
  const run = (label, src, type) =>
    new Promise((res) => {
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })), { type });
      w.onmessage = (e) => res(`${label}: ${e.data}`);
      w.onerror = (e) => res(`${label}: onerror ${e.message}`);
      setTimeout(() => res(`${label}: no reply`), 60000);
    });
  out.push(
    await run(
      "classic fetch",
      `fetch("https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.js").then(r => r.text()).then(t => postMessage("fetched " + t.length)).catch(e => postMessage("fail " + e));`,
      "classic"
    )
  );
  out.push(
    await run(
      "classic importScripts 0.27",
      `try { importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js"); postMessage("ok"); } catch (e) { postMessage("fail " + e); }`,
      "classic"
    )
  );
  out.push(
    await run(
      "module import + load",
      `import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";
       const t0 = performance.now();
       loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/" })
         .then(py => postMessage("loaded " + py.runPython("import sys; sys.version.split()[0]") + " in " + Math.round(performance.now() - t0) + "ms"))
         .catch(e => postMessage("fail " + e));`,
      "module"
    )
  );
  return out.join("\n");
})()
