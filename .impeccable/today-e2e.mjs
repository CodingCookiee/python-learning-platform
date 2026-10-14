// Dev-only: the 2026-10-14 work, for real in the browser (docs/WHATS-LEFT.md sections 4 to 7).
//   BASE=http://localhost:3010 node .impeccable/today-e2e.mjs
// Two throwaway learners, deleted at the end: a working developer (the belt test-out, the lean
// dashboard, the log, the polish) and a black belt by the real rule (the Python certificate).
import { execSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/today/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";
const PORT = 9343;
const DEV = `today-dev-${Date.now()}@example.invalid`;
const BLACK = `today-black-${Date.now()}@example.invalid`;
const PASSWORD = "E2e-Quest-2026";

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-today", "about:blank"]);
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
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") issues.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  else if (m.method === "Runtime.exceptionThrown") issues.push("EXC " + m.params.exceptionDetails.text + " " + (m.params.exceptionDetails.exception?.description ?? "").slice(0, 200));
});
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => {
      if (!pending.has(i)) return;
      pending.delete(i);
      issues.push(`${method} timed out`);
      res({ result: {} });
    }, 60_000);
  });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
const desktop = () => send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const phone = () => send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const scheme = (value) => send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value }] });
await desktop();
await scheme("light");
const go = async (path, wait = 6000) => { await send("Page.navigate", { url: BASE + path }); await sleep(wait); };
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };
const clickText = (selector, text) => ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.includes(${JSON.stringify(text)})); el?.click(); return !!el; })()`);
const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const text = (selector) => ev(`document.querySelector(${JSON.stringify(selector)})?.innerText.replace(/\\s+/g, " ").trim() ?? null`);
const shot = async (name) => writeFileSync(new URL(name, OUT), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
async function shotOf(selector, name, margin = 12) {
  const box = await ev(`(() => { const el = ${selector}; if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x - ${margin}), y: Math.max(0, r.y + scrollY - ${margin}), width: r.width + ${margin * 2}, height: r.height + ${margin * 2} }; })()`);
  if (!box) return false;
  await sleep(300);
  const img = await send("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(new URL(name, OUT), Buffer.from(img.result.data, "base64"));
  return true;
}
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const axe = async () => {
  await ev(axeSource);
  return ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then(r => r.violations.map(v => v.id + " (" + v.nodes.length + "): " + v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(", ")))`);
};
const report = [];
const step = (name, data = {}) => { const r = { step: name, ...data, errors: [...new Set(issues.splice(0))] }; report.push(r); console.log(JSON.stringify(r)); };

async function signIn(email) {
  await send("Network.clearBrowserCookies");
  await go("/auth/signin", 5000);
  await fill("#email", email);
  await fill("#password", PASSWORD);
  await clickText("button[type=submit]", "Sign in");
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await sleep(2500);
}

/** The working developer: the lean dashboard, the belt test-out, the log, the polish */
async function developer() {
  db("existing", DEV);
  await signIn(DEV);

  // The lean dashboard: what's left on it, and the link to the record
  const sections = await ev(`[...document.querySelectorAll("main section, main [data-quest-target=belt], main dl")].length`);
  const headings = await ev(`[...document.querySelectorAll("main h2")].map((h) => h.textContent.trim())`);
  const recordLink = await ev(`[...document.querySelectorAll("main a")].find((a) => a.textContent.includes("your record"))?.getAttribute("href")`);
  const testOutLine = await ev(`document.querySelector("section[aria-labelledby=week-heading]")?.innerText.replace(/\\s+/g, " ").trim()`);
  const height = await ev(`document.documentElement.scrollHeight`);
  await shot("dashboard.png");
  step("lean dashboard", { sections, headings, recordLink, testOutLine, height, axe: await axe() });

  // The profile now holds the record
  await go("/profile", 8000);
  const profileHeadings = await ev(`[...document.querySelectorAll("main h2")].map((h) => h.textContent.trim())`);
  step("profile holds the record", { profileHeadings });

  // The module page: the belt test-out offer, and its start confirmation with the finish time
  const m1 = db("module-id", "1");
  const m3 = db("module-id", "3");
  await go(`/modules/${m3}`, 7000);
  const offer = await text("section[aria-labelledby=belt-test-out-heading]");
  const outcomes = await ev(`(() => { const s = document.querySelector("section[aria-labelledby=outcomes-heading]"); return s ? { heading: s.querySelector("h2").textContent, checks: s.querySelectorAll("svg").length } : null; })()`);
  await clickText("section[aria-labelledby=belt-test-out-heading] button", "Test out of the white belt");
  await sleep(600);
  const confirm = await text("section[aria-labelledby=belt-test-out-heading] [role=group]");
  await shotOf(`document.querySelector("section[aria-labelledby=belt-test-out-heading]")`, "belt-offer.png");
  step("module page offers the belt test-out", { offer, confirm, outcomes, axe: await axe() });

  // Late at night (the browser's clock moved to 23:10 local), the same confirmation warns
  const utcHour = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  const offset = Math.round(23.2 - utcHour + 24) % 24;
  const tz = offset === 0 ? "Etc/GMT" : offset <= 12 ? `Etc/GMT-${offset}` : `Etc/GMT+${24 - offset}`;
  await send("Emulation.setTimezoneOverride", { timezoneId: tz });
  await go(`/modules/${m1}`, 7000);
  await clickText("section[aria-labelledby=belt-test-out-heading] button", "Test out of the white belt");
  await sleep(600);
  const lateConfirm = await text("section[aria-labelledby=belt-test-out-heading] [role=group]");
  await shotOf(`document.querySelector("section[aria-labelledby=belt-test-out-heading]")`, "belt-offer-late.png");
  await send("Emulation.setTimezoneOverride", { timezoneId: "" });
  step("late-night warning", { tz, lateConfirm });

  // Start it: the grading page names the belt and its modules
  await clickText("section[aria-labelledby=belt-test-out-heading] button", "Start the clock");
  const started = await waitFor(`location.pathname.startsWith("/checkpoints/")`, 40);
  await sleep(2500);
  const attempt = {
    title: await ev(`document.title`),
    kicker: await text("main header p"),
    h1: await text("main h1"),
    lede: await ev(`document.querySelectorAll("main header p")[1]?.innerText.trim()`),
    drills: await ev(`document.querySelectorAll("main ol li").length`),
  };
  await shot("belt-attempt.png");
  // Module 1's own grading isn't hijacked by the running test-out
  await go(`/modules/${m1}`, 7000);
  const ownGrading = await text("section[aria-labelledby=checkpoint-heading]");
  const resume = await text("section[aria-labelledby=belt-test-out-heading]");
  step("belt test-out started", { started, attempt, ownGrading, resume });

  // The learning log drafts the facts only
  await go("/log", 8000);
  const log = await ev(`({ learned: document.querySelector("#log-learned")?.value, stuck: document.querySelector("#log-stuck")?.value, built: document.querySelector("#log-built")?.value, prompts: [...document.querySelectorAll("[id$=-prompt]")].map((p) => p.innerText) })`);
  step("log drafts the facts", { log, axe: await axe() });

  // Settings: no jade primary until there's something to save
  await go("/settings", 7000);
  const variants = async () => ev(`[...document.querySelectorAll("main form button[type=submit]")].map((b) => b.textContent.trim().slice(0, 30) + ": " + (b.className.includes("bg-primary") ? "primary" : "outline"))`);
  const atRest = await variants();
  await ev(`(() => { const el = document.querySelector("#settings-name"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, el.value + " Jr"); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await sleep(300);
  const edited = await variants();
  step("settings primaries", { atRest, edited });

  // A drill: the tutor's add-a-key offer can be hidden for good
  const drill = db("drill-id", "hello-pylearn");
  await go(`/exercises/${drill}`, 9000);
  const offerBefore = await ev(`[...document.querySelectorAll("main p")].some((p) => p.textContent.includes("The AI tutor points you"))`);
  await ev(`document.querySelector("button[aria-label='Hide the tutor offer on every drill']")?.click()`);
  await sleep(400);
  const offerAfterClick = await ev(`[...document.querySelectorAll("main p")].some((p) => p.textContent.includes("The AI tutor points you"))`);
  await go(`/exercises/${drill}`, 9000);
  const offerAfterReload = await ev(`[...document.querySelectorAll("main p")].some((p) => p.textContent.includes("The AI tutor points you"))`);
  step("tutor offer hides", { drill, offerBefore, offerAfterClick, offerAfterReload });

  // Achievements: singular units
  await go("/achievements", 8000);
  const units = await ev(`[...document.body.innerText.matchAll(/\\d+ of 1 [a-zA-Z ]+/g)].map((m) => m[0]).slice(0, 6)`);
  step("achievements singular", { units });

  // Review: bars against the daily cap
  await go("/review", 7000);
  const bars = await ev(`[...document.querySelectorAll("section[aria-labelledby=week-heading] li span[aria-hidden]")].map((s) => s.style.height)`);
  step("review bars", { bars });

  // A capstone under review: the expected wait
  const sub = db("capstone-submission", DEV);
  const project = db("submission-project", sub);
  await go(`/projects/${project}`, 9000);
  const wait = await ev(`[...document.querySelectorAll("main p")].find((p) => p.textContent.includes("examiner reads every capstone"))?.innerText`);
  step("capstone wait", { wait });

  // Dark mode: the black belt on the profile's rank card and the belt ladder
  await scheme("dark");
  await go("/profile", 8000);
  await shotOf(`document.querySelector("[aria-label='Belt ranks']")?.closest("section, div") ?? document.querySelector("main")`, "dark-belt-ladder.png");
  await scheme("light");
  step("dark black belt", {});
}

/** The black belt: claim the Python certificate through the eligibility check */
async function blackBelt() {
  db("existing", BLACK);
  const ready = db("black-belt-ready", BLACK);
  await signIn(BLACK);
  const band = await text("section[aria-labelledby=next-heading]");
  await go("/profile", 1000);
  const SECTION = `document.querySelector("section[aria-labelledby=certificates-heading]")`;
  await waitFor(`!!${SECTION}`, 80);
  await sleep(800);
  const rows = await ev(`[...(${SECTION})?.querySelectorAll("li") ?? []].map((li) => li.innerText.replace(/\\s+/g, " ").trim())`);
  await ev(`[...(${SECTION})?.querySelectorAll("button") ?? []].find((b) => b.textContent.includes("Claim your certificate"))?.click()`);
  await waitFor(`!!document.querySelector("[role=dialog] #claim-name")`, 20);
  await sleep(500);
  await fill("#claim-name", "Ada Lovelace");
  await sleep(300);
  await ev(`[...document.querySelectorAll("[role=dialog] button[type=submit]")].find((b) => b.textContent.includes("Issue my certificate"))?.click()`);
  const landed = await waitFor(`location.pathname.startsWith("/certificates/PL-PY-")`, 40);
  await sleep(2500);
  const code = await ev(`location.pathname.split("/").pop()`);
  const page = await ev(`({ title: document.title, h1: document.querySelector("h1")?.textContent, linkedIn: [...document.querySelectorAll("a")].find((a) => a.href.includes("linkedin.com"))?.href ?? null })`);
  await shot("python-certificate.png");
  // The PNG, with fonts read from disk
  const img = await fetch(`${BASE}/certificates/${code}/image`);
  const bytes = Buffer.from(await img.arrayBuffer());
  writeFileSync(new URL("python-certificate-image.png", OUT), bytes);
  step("python certificate", { ready, band, rows, landed, code, page, image: { status: img.status, type: img.headers.get("content-type"), bytes: bytes.length } });
}

/** Signed out: the landing page folds the automation modules; its height on a phone */
async function landing() {
  await send("Network.clearBrowserCookies");
  await desktop();
  await go("/", 7000);
  const fold = await ev(`(() => { const d = document.querySelector("article[aria-labelledby=belt-dan] details"); return d ? { open: d.open, summary: d.querySelector("summary").innerText.replace(/\\s+/g, " ").trim(), items: d.querySelectorAll("li").length } : null; })()`);
  await shotOf(`document.querySelector("article[aria-labelledby=belt-dan]")`, "landing-automation.png");
  await phone();
  await go("/", 7000);
  const phoneHeight = await ev(`document.documentElement.scrollHeight`);
  await desktop();
  step("landing", { fold, phoneHeight, axe: await axe() });
}

try {
  await developer();
  await blackBelt();
  await landing();
} catch (e) {
  report.push({ step: "crashed", error: String((e && e.stack) || e) });
  console.log(JSON.stringify(report.at(-1)));
} finally {
  report.push({ step: "cleanup", result: db("cleanup", DEV, BLACK) });
  console.log(JSON.stringify(report.at(-1)));
  ws.close();
  chrome.kill();
  process.exit(0);
}
