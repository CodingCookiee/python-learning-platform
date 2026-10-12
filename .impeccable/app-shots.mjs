// Dev-only: screenshots of every main surface of the app, for design reviews (impeccable critique / audit).
//   BASE=http://localhost:3010 node .impeccable/app-shots.mjs
//   INJECT=http://localhost:8400/detect.js node .impeccable/app-shots.mjs   also runs the detector overlay on a few pages
// Throwaway accounts only (a learner, and an examiner with the admin role), deleted at the end.
// Writes PNGs and manifest.json to .impeccable/review/app/ (OUT to change).
import { execSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = new URL(process.env.OUT ?? "./review/app/", import.meta.url);
const INJECT = process.env.INJECT ?? "";
mkdirSync(OUT, { recursive: true });
const PORT = 9343;
const stamp = Date.now();
const LEARNER = `shots-${stamp}@example.invalid`;
const EXAMINER = `shots-examiner-${stamp}@example.invalid`;
const PASSWORD = "E2e-Quest-2026";

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-shots", "about:blank"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try {
    wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {}
  await sleep(200);
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const consoleLines = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  else if (m.method === "Runtime.consoleAPICalled") consoleLines.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 2000));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
// The detector overlay is a script from another origin: let it past the app's CSP for this run only
if (INJECT) await send("Page.setBypassCSP", { enabled: true });

const VIEWPORTS = { desktop: { width: 1440, height: 900, mobile: false }, mobile: { width: 390, height: 844, mobile: true } };
async function viewport(name, theme = "light") {
  const v = VIEWPORTS[name];
  await send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
}
async function theme(name) {
  await ev(`(() => { try { localStorage.setItem("theme", ${JSON.stringify(name)}); } catch {} })()`);
}

const manifest = [];
const overlay = [];
/** Load a page and capture it: the first viewport, and the whole page (capped) when it's long */
async function shot(key, path, { vp = "desktop", mode = "light", note = "", before, wait = 6500, full = true } = {}) {
  await viewport(vp, mode);
  await send("Page.navigate", { url: BASE + path });
  await sleep(wait);
  if (before) {
    await before();
    await sleep(800);
  }
  if (full) await ev(`window.scrollTo(0, 0)`);
  await sleep(300);
  const at = await ev("location.pathname + location.search");
  const file = `${key}-${vp}${mode === "dark" ? "-dark" : ""}.png`;
  const metrics = await send("Page.getLayoutMetrics");
  const height = Math.ceil(metrics.result.cssContentSize?.height ?? metrics.result.contentSize.height);
  const cap = vp === "desktop" ? 3600 : 3200;
  const v = VIEWPORTS[vp];
  const clip = full ? { x: 0, y: 0, width: v.width, height: Math.min(height, cap), scale: 1 } : undefined;
  const img = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip, captureBeyondViewport: true } : {}) });
  writeFileSync(new URL(file, OUT), Buffer.from(img.result.data, "base64"));
  manifest.push({ key, file, url: at, viewport: vp, theme: mode, pageHeight: height, cappedAt: height > cap ? cap : null, note });
  if (INJECT && vp === "desktop" && mode === "light" && ["landing", "dashboard", "lesson", "drill", "evaluate"].includes(key)) {
    consoleLines.length = 0;
    await ev(`(() => { const s = document.createElement("script"); s.src = ${JSON.stringify(INJECT)}; document.body.appendChild(s); return true; })()`);
    await sleep(3000);
    overlay.push({ key, url: at, console: consoleLines.filter((l) => /impeccable/i.test(l)).slice(0, 40), allConsole: consoleLines.length });
  }
  console.log("captured", file, at);
}

try {
  // Accounts and data: a learner part-way into module 1, an examiner with a submission waiting
  db("existing", LEARNER);
  db("pass-lesson", LEARNER, "running-python");
  const lesson = db("lesson-id", "running-python");
  const moduleId = db("module-id", "1");
  const drill = db("drill-id", "hello-pylearn");
  const submission = db("capstone-submission", LEARNER);
  db("examiner", EXAMINER);

  // Signed out
  await send("Network.clearBrowserCookies");
  await shot("landing", "/", { note: "Landing page (Persuade)" });
  await shot("landing", "/", { vp: "mobile", note: "Landing page, phone" });
  await shot("signup", "/auth/signup", { note: "Sign-up" });
  await shot("signup", "/auth/signup", { vp: "mobile", note: "Sign-up, phone" });

  // The learner
  await viewport("desktop");
  await send("Page.navigate", { url: BASE + "/auth/signin" });
  await sleep(4000);
  await fill("#email", LEARNER);
  await fill("#password", PASSWORD);
  await ev(`document.querySelector("form button[type=submit]").click()`);
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await sleep(2000);

  const only = process.env.PAGES ? new Set(process.env.PAGES.split(",")) : null;
  const pages = [
    ["dashboard", "/dashboard", "Dashboard: rank, streak, this week, quest offer"],
    ["syllabus", "/modules", "Syllabus: belts and modules"],
    ["module", `/modules/${moduleId}`, "Module 1 sheet: lessons, checkpoint"],
    ["lesson", `/lessons/${lesson}`, "A lesson (Read): text, runnable examples, scratchpad"],
    ["drill", `/exercises/${drill}`, "A practice drill (Operate): task, editor, tests"],
    ["review", "/review", "Spaced review queue"],
    ["log", "/log", "Weekly learning log"],
    ["achievements", "/achievements", "Achievements"],
    ["profile", "/profile", "Profile and record"],
    ["settings", "/settings", "Settings, including the AI key"],
  ];
  for (const [key, path, note] of pages.filter(([key]) => !only || only.has(key))) {
    await shot(key, path, { note });
    await shot(key, path, { vp: "mobile", note: `${note}, phone` });
  }

  // The drill after a run: one passing (the reference solution), one failing (the starter)
  const solution = JSON.parse(db("drill", drill)).solution;
  const runWith = (code) => async () => {
    await waitFor(`!!window.monaco?.editor?.getEditors?.().length`, 60);
    await ev(`(() => { const ed = window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)); ed.setValue(${JSON.stringify(code)}); })()`);
    await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
    await waitFor(`/Drill passed|passed|failed|Error/i.test(document.querySelector("main")?.innerText ?? "") && !document.querySelector("[data-quest-target=run-tests][aria-busy=true]")`, 120);
    await sleep(4000);
  };
  await shot("drill-failing", `/exercises/${drill}`, { note: "Drill after a failing run", before: runWith("print('not yet')") });
  await shot("drill-passed", `/exercises/${drill}`, { note: "Drill after a passing run (saved, celebrations dismissed)", before: async () => {
    await runWith(solution)();
    for (let i = 0; i < 6; i++) {
      await ev(`[...document.querySelectorAll("[role=dialog] button")].find((b) => /Keep training|Close|Continue/i.test(b.textContent))?.click()`);
      await sleep(600);
    }
  } });

  await shot("drill-passed", `/exercises/${drill}`, { vp: "mobile", note: "Drill after a passing run, phone (the Code pane, where the pass strip is)", before: async () => {
    await ev(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Code")?.click()`);
    await sleep(800);
    await runWith(solution)();
    for (let i = 0; i < 6; i++) {
      await ev(`[...document.querySelectorAll("[role=dialog] button")].find((b) => /Keep training|Close|Continue/i.test(b.textContent))?.click()`);
      await sleep(600);
    }
    // Scroll the pass strip into view for the shot
    await ev(`[...document.querySelectorAll("div")].find((d) => d.className.includes("bg-accent/55"))?.scrollIntoView({ block: "center" })`);
  }, full: false });

  // Dark theme on the core surfaces
  await theme("dark");
  for (const [key, path, note] of [["dashboard", "/dashboard", "Dashboard, dark"], ["lesson", `/lessons/${lesson}`, "Lesson, dark"], ["drill", `/exercises/${drill}`, "Drill, dark"]]) {
    await shot(key, path, { mode: "dark", note });
  }
  await theme("light");

  // A checkpoint: start one, then its page and one of its drills
  await viewport("desktop");
  await send("Page.navigate", { url: BASE + `/modules/${moduleId}` });
  await sleep(6000);
  await ev(`[...document.querySelectorAll("button")].find((b) => /checkpoint|Test out/i.test(b.textContent))?.click()`);
  await waitFor(`location.pathname.startsWith("/checkpoints/")`, 40);
  await sleep(2500);
  const checkpoint = await ev("location.pathname");
  const checkpointDrill = await ev(`document.querySelector("main a[href^='/exercises/']")?.getAttribute("href")`);
  await shot("checkpoint", checkpoint, { note: "An open checkpoint: clock, drills, hand-in" });
  if (checkpointDrill) await shot("checkpoint-drill", checkpointDrill, { note: "A drill inside a checkpoint (clipboard locked, no hints)" });

  // The examiner
  await send("Network.clearBrowserCookies");
  await viewport("desktop");
  await send("Page.navigate", { url: BASE + "/auth/signin" });
  await sleep(4000);
  await fill("#email", EXAMINER);
  await fill("#password", PASSWORD);
  await ev(`document.querySelector("form button[type=submit]").click()`);
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await sleep(1500);
  await shot("admin", "/admin", { note: "Admin home: queue, content, learners" });
  await shot("evaluate", `/admin/projects/${submission}/evaluate`, { note: "Examiner grading a capstone (with Grade with AI)" });
  await shot("evaluate", `/admin/projects/${submission}/evaluate`, { vp: "mobile", note: "Examiner grading, phone" });
} catch (e) {
  manifest.push({ error: String((e && e.stack) || e) });
} finally {
  const cleanup = db("cleanup", LEARNER, EXAMINER);
  writeFileSync(new URL("manifest.json", OUT), JSON.stringify({ base: BASE, cleanup, shots: manifest, overlay: INJECT ? overlay : undefined }, null, 2));
  console.log("cleanup", cleanup, "→", new URL("manifest.json", OUT).pathname);
  ws.close();
  chrome.kill();
  process.exit(0);
}
