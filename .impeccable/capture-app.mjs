// Dev-only: signs in as the review account and captures signed-in pages over CDP.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/app/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const PORT = 9335;
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-app",
  "about:blank",
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    wsUrl = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {}
  await sleep(200);
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const issues = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  else if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type))
    issues.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 2500));
  else if (m.method === "Runtime.exceptionThrown") issues.push("EXC " + m.params.exceptionDetails.text);
});
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result
    ?.result?.value;
await send("Page.enable");
await send("Runtime.enable");

async function setup(width, height, scheme) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
}
async function go(path, wait = 5000) {
  await send("Page.navigate", { url: BASE + path });
  await sleep(wait);
}
async function shot(name) {
  const h = await ev("document.documentElement.scrollHeight");
  const w = await ev("document.documentElement.clientWidth");
  const res = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: w, height: Math.min(h, 6000), scale: 1 },
  });
  writeFileSync(new URL(name, OUT), Buffer.from(res.result.data, "base64"));
  console.log("saved", name, "path:", await ev("location.pathname"));
}

// Sign in through the real form
await setup(1440, 900, "light");
await go("/auth/signin", 4000);
await ev(`(() => {
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); };
  set(document.querySelector('#email'), 'design-review@pylearn.local');
  set(document.querySelector('#password'), 'ReviewPass!2026');
})()`);
await sleep(300);
await ev(`document.querySelector('form button[type=submit]').click()`);
for (let i = 0; i < 120; i++) {
  if ((await ev("location.pathname")) === "/dashboard") break;
  await sleep(500);
}
await sleep(3000);

const ids = JSON.parse((await import("node:fs")).readFileSync(process.env.TEMP + "/review-ids.json", "utf8"));
// SHOTS="path|name|scheme;path|name|scheme" captures specific pages only
if (process.env.SHOTS) {
  for (const spec of process.env.SHOTS.split(";")) {
    const [path, name, scheme = "light", width = "1440"] = spec.split("|");
    await setup(Number(width), Number(width) < 600 ? 844 : 900, scheme);
    await go(path, 6000);
    await shot(name);
  }
  console.log("SHOTS console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 200)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.MENU) {
  await setup(390, 844, "light");
  await go(`/dashboard`, 8000);
  const clicked = await ev(`(() => { const b = document.querySelector('button[aria-label="Open navigation menu"]'); b?.click(); return !!b; })()`);
  await sleep(1200);
  console.log("MENU clicked:", clicked, "open:", await ev(`!!document.querySelector('[aria-label="Mobile navigation"]')`));
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("mobile-menu.png", OUT), Buffer.from(r.result.data, "base64"));
  await setup(1440, 900, "light");
  await go(`/modules/does-not-exist`);
  await shot("not-found-app.png");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.FINAL) {
  const exId = process.env.FINAL;
  await go(`/exercises/${exId}`, 7000);
  await shot("exercise.png");
  // Solve the drill and grade it
  const graded = await ev(`(async () => {
    const btn = [...document.querySelectorAll('button')].find(b => /Run & Test/.test(b.textContent));
    if (!btn) return 'no run button';
    btn.click();
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (/tests passed/.test(document.body.innerText)) return document.body.innerText.match(/\\d+\\/\\d+ tests passed/)[0];
    }
    return 'timeout';
  })()`);
  console.log("FINAL drill (starter code):", graded);
  await sleep(800);
  await shot("exercise-run.png");
  await go(`/projects/${ids.project}/submit`);
  await shot("project-submit.png");
  await go(`/admin/projects`);
  await shot("admin-submissions.png");
  const evalHref = await ev(`document.querySelector('a[href*="/evaluate"]')?.getAttribute('href') ?? null`);
  if (evalHref) {
    await go(evalHref);
    await shot("admin-evaluate.png");
    if (process.env.STAMP) {
      // Grade it: tick every criterion, write feedback, approve, catch the seal mid-stamp
      await ev(`(() => {
        document.querySelectorAll('button[aria-pressed="false"]').forEach((b) => b.click());
        const t = document.querySelector('textarea');
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'Clean structure and clear names. Next, add tests for the edge cases.');
        t.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await sleep(400);
      await shot("admin-evaluate-filled.png");
      await ev(`[...document.querySelectorAll('button')].find(b => /Approve and stamp/.test(b.textContent))?.click()`);
      await sleep(500);
      await ev(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Approve')?.click()`);
      for (let i = 0; i < 150; i++) {
        await sleep(100);
        if (await ev(`Boolean(document.querySelector('[aria-label="Passed: Capstone graded"]'))`)) break;
      }
      await sleep(350);
      const st = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(new URL("admin-evaluate-stamp.png", OUT), Buffer.from(st.result.data, "base64"));
    }
  }
  await go(`/modules/does-not-exist`);
  await shot("not-found-app.png");
  await go(`/this-page-does-not-exist`);
  await shot("not-found-root.png");
  await go(`/dashboard`);
  await ev(`[...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.startsWith('Search'))?.click()`);
  await sleep(600);
  await ev(`(() => { const i = document.querySelector('input[aria-label="Search query"]'); if (!i) return; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'list'); i.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(2500);
  const r1 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("search-open.png", OUT), Buffer.from(r1.result.data, "base64"));
  await setup(390, 844, "light");
  await go(`/dashboard`);
  await ev(`[...document.querySelectorAll('button')].find(b => /menu/i.test(b.getAttribute('aria-label') ?? ''))?.click()`);
  await sleep(700);
  const r2 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("mobile-menu.png", OUT), Buffer.from(r2.result.data, "base64"));
  await setup(1440, 900, "dark");
  await go(`/exercises/${exId}`, 7000);
  await shot("exercise-dark.png");
  console.log("FINAL console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.RUNTEST) {
  await go(`/lessons/${ids.lesson}`, 6000);
  const report = await ev(`(async () => {
    const blocks = [...document.querySelectorAll('div.my-6')];
    const target = blocks.filter(b => [...b.querySelectorAll('button')].some(x => x.textContent.trim() === 'Run'))[1];
    if (!target) return 'no second runnable block';
    const btn = [...target.querySelectorAll('button')].find(x => x.textContent.trim() === 'Run');
    target.scrollIntoView({ block: 'center' });
    btn.click();
    const t0 = performance.now();
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 500));
      const out = target.querySelector('[aria-live=polite]');
      if (out && !out.className.includes('opacity-55')) {
        return 'after ' + Math.round((performance.now() - t0) / 1000) + 's: ' + out.textContent.slice(0, 160);
      }
    }
    return 'timeout; button now: ' + btn.textContent.trim();
  })()`);
  console.log("RUNTEST", report);
  console.log(
    "RUNTEST resources:",
    await ev(`performance.getEntriesByType('resource').filter(r => r.name.includes('pyodide')).map(r => r.name.split('/').pop() + ' ' + Math.round(r.duration) + 'ms ' + r.transferSize + 'B').join(' | ')`)
  );
  console.log("RUNTEST console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 400)) : "none");
  console.log(
    "RUNTEST direct load:",
    await ev(`(async () => {
      const t0 = performance.now();
      try {
        const race = await Promise.race([
          window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/" }).then(() => "loaded"),
          new Promise((r) => setTimeout(() => r("still pending"), 60000)),
        ]);
        return race + " after " + Math.round((performance.now() - t0) / 1000) + "s";
      } catch (e) {
        return "threw: " + e.message;
      }
    })()`)
  );
  console.log(
    "RUNTEST pyodide:",
    await ev(`JSON.stringify({ script: !!document.querySelector('script[src*="pyodide"]'), loader: typeof window.loadPyodide })`)
  );
  await sleep(400);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("lesson-run.png", OUT), Buffer.from(r.result.data, "base64"));
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.EVAL) {
  // EVAL="<path>|<js expression>": print the expression's value on that page
  const [path, expr] = process.env.EVAL.split("|");
  await go(path);
  console.log("EVAL ->", JSON.stringify(await ev(expr)));
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.PROBE) {
  for (const url of [`/api/lessons/${ids.lesson}`, `/api/modules/${ids.module}`]) {
    const out = await ev(
      `fetch(${JSON.stringify(url)}).then(async (r) => r.status + " " + (await r.text()).slice(0, 500))`
    );
    console.log("PROBE", url, "->", out);
  }
  ws.close();
  chrome.kill();
  process.exit(0);
}
const pages = [
  ["/dashboard", "dashboard"],
  ["/modules", "syllabus"],
  [`/modules/${ids.module}`, "module"],
  [`/lessons/${ids.lesson}`, "lesson"],
  [`/projects/${ids.project}`, "project"],
];
for (const [path, name] of pages) {
  await go(path);
  await shot(`${name}.png`);
}
// Run the first runnable example on the lesson page
await go(`/lessons/${ids.lesson}`);
const ran = await ev(`(async () => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Run');
  if (!btn) return 'no runnable block';
  btn.scrollIntoView({ block: 'center' });
  btn.click();
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 500));
    const out = [...document.querySelectorAll('[aria-live=polite]')].find(e => /Output|Error/.test(e.textContent));
    if (out && !out.className.includes('opacity-55')) return out.textContent.slice(0, 200);
  }
  return 'timeout';
})()`);
console.log("run result:", ran);
await sleep(500);
const res = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(new URL("lesson-run.png", OUT), Buffer.from(res.result.data, "base64"));
await setup(1440, 900, "dark");
for (const [path, name] of [[`/lessons/${ids.lesson}`, "lesson"], ["/modules", "syllabus"]]) {
  await go(path);
  await shot(`${name}-dark.png`);
}
await setup(390, 844, "light");
for (const [path, name] of [[`/lessons/${ids.lesson}`, "lesson"], [`/modules/${ids.module}`, "module"]]) {
  await go(path);
  await shot(`${name}-mobile.png`);
}
console.log("console issues:", issues.length ? [...new Set(issues)] : "none");
ws.close();
chrome.kill();
process.exit(0);
