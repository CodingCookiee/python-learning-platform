// Dev-only: the AI tutor's waiting state, for real in the browser, without calling any AI provider.
//   BASE=http://localhost:3010 node .impeccable/tutor-wait-e2e.mjs
// A throwaway learner with a dummy key opens a drill, runs the tests (a failing run), asks the tutor,
// and the browser holds the /api/tutor request for ~42 s before answering with a canned reply, so
// every waiting line shows. Then once more with reduced motion. The account is deleted at the end.
import { execSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/tutor/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";
const PORT = 9340;
const EMAIL = `tutor-wait-${Date.now()}@example.invalid`;
const PASSWORD = "E2e-Quest-2026";
const HOLD_MS = Number(process.env.HOLD_MS) || 42_000;

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-tutor", "about:blank"]);
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
const issues = [];
const paused = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Fetch.requestPaused") return void paused.push(m.params.requestId);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") issues.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  else if (m.method === "Runtime.exceptionThrown") issues.push("EXC " + m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const media = (features) => send("Emulation.setEmulatedMedia", { features });
const go = async (path, wait = 6000) => { await send("Page.navigate", { url: BASE + path }); await sleep(wait); };
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };
const clickText = (selector, text) => ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.includes(${JSON.stringify(text)})); el?.click(); return !!el; })()`);
const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const shot = async (name) => writeFileSync(new URL(name, OUT), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const axe = async () => {
  await ev(axeSource);
  return ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then(r => r.violations.map(v => v.id + " (" + v.nodes.length + "): " + v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(", ")))`);
};
const report = [];

const WAIT = `document.querySelector("#tutor-heading")?.closest("section")?.querySelector("ol > li:last-child")`;
const shown = () => ev(`(() => { const li = ${WAIT}; return li ? [...li.querySelectorAll("[aria-hidden=true]")].map((s) => s.textContent).filter(Boolean).join("") : null; })()`);
const spoken = () => ev(`${WAIT}?.querySelector(".sr-only")?.textContent ?? null`);

/** Ask the tutor and watch the wait; the request is answered after `holdMs` */
async function askAndWatch(label, holdMs, checkpoints) {
  paused.length = 0;
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/tutor*", requestStage: "Request" }] });
  if (!(await ev(`!!document.querySelector('[aria-label="Question for the tutor"]')`))) {
    await clickText("#tutor-heading", "Ask the tutor");
    await sleep(400);
  }
  // The starter questions only show before the first one; after that, type and send
  if (!(await clickText("section button", "Why is a test failing?"))) {
    await ev(`(() => { const el = document.querySelector('[aria-label="Question for the tutor"]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, "Why does it fail on an empty list?"); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    await sleep(200);
    await ev(`document.querySelector('button[aria-label="Send"]').click()`);
  }
  const t0 = Date.now();
  const seen = [];
  for (const at of checkpoints) {
    await sleep(Math.max(0, at - (Date.now() - t0)));
    seen.push({ at, shown: await shown(), spoken: await spoken() });
    if (at === checkpoints[1]) await shot(`${label}-waiting.png`);
  }
  const shimmer = await ev(`(() => { const s = ${WAIT}?.querySelector("span.absolute"); return s ? { display: getComputedStyle(s).display, animation: getComputedStyle(s).animationName } : null; })()`);
  const waitingAxe = await axe();
  await sleep(Math.max(0, holdMs - (Date.now() - t0)));
  const reply = "Look at what your loop does when the list is empty. What does `total` start as?";
  for (const requestId of paused.splice(0)) {
    await send("Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(JSON.stringify({ reply, question: "Why is my code failing the tests?" })).toString("base64"),
    });
  }
  await send("Fetch.disable");
  const answered = await waitFor(`document.querySelector("#tutor-heading").closest("section").innerText.includes("What does")`, 20);
  await sleep(500);
  await shot(`${label}-answered.png`);
  return { seen, shimmer, waitingAxe, answered, waitGone: (await shown()) === null || !(await shown())?.includes("…") };
}

try {
  db("tutor", EMAIL);
  await go("/auth/signin", 5000);
  await fill("#email", EMAIL);
  await fill("#password", PASSWORD);
  await clickText("button[type=submit]", "Sign in");
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await go(`/exercises/${db("drill-id", "hello-pylearn")}`, 7000);
  // A failing run first, so the tutor has a "last run" to read
  await waitFor(`!document.querySelector("[data-quest-target=run-tests]")?.textContent.includes("Loading")`, 120);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  await waitFor(`/\\d+ of \\d+ tests passed/.test(document.body.innerText)`, 120);
  await ev(`document.querySelector("#tutor-heading").scrollIntoView({ block: "start" })`);
  await sleep(800);

  await media([{ name: "prefers-color-scheme", value: "light" }]);
  report.push({ step: "wait, full length", ...(await askAndWatch("light", HOLD_MS, [300, 3000, 5500, 8000, 16500, 41000])), errors: [...new Set(issues.splice(0))] });

  await media([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "dark" }]);
  report.push({ step: "reduced motion, dark", ...(await askAndWatch("reduced-dark", 4000, [300, 2800])), errors: [...new Set(issues.splice(0))] });
} catch (e) {
  report.push({ step: "crashed", error: String(e && e.stack || e) });
} finally {
  report.push({ step: "cleanup", result: db("cleanup", EMAIL) });
  for (const r of report) console.log(JSON.stringify(r));
  ws.close();
  chrome.kill();
  process.exit(0);
}
