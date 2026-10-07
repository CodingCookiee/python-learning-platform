// Dev-only: the beginner on-ramp end to end with throwaway accounts (deleted at the end).
//   BASE=http://localhost:3010 node .impeccable/onramp-e2e.mjs
// Sign up (16+ box) → onboarding as "New to programming" → the on-ramp page → the dashboard card →
// finish lesson 6 → the white belt ceremony → module 1; then an account with no age on record.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/onramp/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";
const PORT = 9337;
const stamp = Date.now();
const EMAIL = `onramp-e2e-${stamp}@example.invalid`;
const NOAGE = `onramp-noage-${stamp}@example.invalid`;
const PASSWORD = "E2e-Onramp-2026";

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-onramp", "about:blank"]);
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
  else if (m.method === "Runtime.exceptionThrown") issues.push("EXC " + m.params.exceptionDetails.text);
  else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") issues.push("LOG " + m.params.entry.text.slice(0, 300));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Network.clearBrowserCookies");

const go = async (path, wait = 5000) => { await send("Page.navigate", { url: BASE + path }); await sleep(wait); };
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };
const at = () => ev("location.pathname");
const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const clickText = (selector, text) => ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.includes(${JSON.stringify(text)})); el?.click(); return !!el; })()`);
const shot = async (name) => {
  const h = await ev("document.documentElement.scrollHeight");
  const res = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: Math.min(h, 3000), scale: 1 } });
  writeFileSync(new URL(name, OUT), Buffer.from(res.result.data, "base64"));
};
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const axe = async () => {
  await ev(axeSource);
  return ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then(r => r.violations.map(v => v.id + " (" + v.nodes.length + "): " + v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(", ")))`);
};
const db = (...args) => execSync(`npx tsx .impeccable/onramp-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const report = [];
const step = async (name, data = {}) => { report.push({ step: name, ...data, errors: [...new Set(issues.splice(0))] }); };

try {
  // 1. Sign up: refused without the age box, accepted with it
  await go("/auth/signup", 6000);
  await fill("#name", "Ada Beginner");
  await fill("#email", EMAIL);
  await fill("#password", PASSWORD);
  await fill("#confirmPassword", PASSWORD);
  await clickText("button[type=submit]", "Create account");
  await sleep(1200);
  const refused = await ev(`document.querySelector("#ageConfirmed-error")?.textContent ?? ""`);
  const signupAxe = await axe();
  await ev(`document.querySelector("#ageConfirmed").click()`);
  await clickText("button[type=submit]", "Create account");
  await waitFor(`location.pathname === "/onboarding"`, 60);
  await step("sign-up", { refusedWithoutAge: refused, landedOn: await at(), axe: signupAxe });

  // 2. Onboarding as "New to programming" → the on-ramp page
  await sleep(1500);
  const askedAge = await ev(`document.body.innerText.includes("How old are you?")`);
  await clickText("[role=radio]", "New to programming");
  await clickText("[role=radio]", "Advanced Python");
  await clickText("button", "Start training");
  await waitFor(`location.pathname.startsWith("/modules/")`, 60);
  await sleep(2500);
  const onRampPath = await at();
  await shot("1-onramp-module.png");
  await step("onboarding", {
    askedAgeAgain: askedAge,
    newToProgrammingText: await ev(`document.body.innerText.includes("Start with Start here")`),
    landedOn: onRampPath,
    belt: await ev(`document.querySelector('[role=img][aria-label*="lessons done"], [role=img][aria-label*="belt tied"]')?.getAttribute("aria-label")`),
    header: await ev(`document.body.innerText.match(/Before the white belt[^\\n]*/)?.[0]`),
    axe: await axe(),
  });

  // 3. The dashboard card at the start
  await go("/dashboard", 6000);
  await shot("2-dashboard-start.png");
  await step("dashboard-start", {
    card: await ev(`document.querySelector("#onramp-heading")?.textContent`),
    next: await ev(`document.querySelector("#onramp-heading")?.closest("section")?.innerText.match(/Lesson \\d+ of \\d+[^\\n]*/)?.[0]`),
    streakGoal: await ev(`document.body.innerText.match(/Aim for 3 days[^\\n]*|3 days in a row: done[^\\n]*/)?.[0]`),
    button: await ev(`[...document.querySelectorAll("#onramp-heading ~ * a, section a")].find((a) => /Start lesson 1|Continue/.test(a.textContent))?.textContent`),
    axe: await axe(),
  });

  // 4. Lessons 1-5 done (database), then finish lesson 6 in the browser → the ceremony
  const { lesson6, python1 } = JSON.parse(db("prepare", EMAIL));
  await go("/dashboard", 6000);
  await step("dashboard-lesson-6", { next: await ev(`document.querySelector("#onramp-heading")?.closest("section")?.innerText.match(/Lesson \\d+ of \\d+[^\\n]*/)?.[0]`) });
  await go(`/lessons/${lesson6}`, 7000);
  await clickText("button", "Mark lesson complete");
  const ceremony = await waitFor(`document.body.innerText.includes("Your white belt is tied")`, 40);
  await sleep(1500);
  await shot("3-ceremony.png");
  const ceremonyAxe = await axe();
  const startHref = await ev(`[...document.querySelectorAll("a")].find((a) => a.textContent.includes("Start module 1"))?.getAttribute("href")`);
  await sleep(3000);
  const stayed = await at();
  await clickText("a", "Start module 1");
  await waitFor(`location.pathname === "/modules/${python1}"`, 30);
  await step("ceremony", { shown: ceremony, stayedOnLessonWhileShown: stayed === `/lessons/${lesson6}`, startModule1: startHref === `/modules/${python1}`, landedOn: await at(), axe: ceremonyAxe });

  // 5. After: no card, still 16 kyu, the on-ramp's badges earned
  await go("/dashboard", 6000);
  await step("dashboard-after", {
    cardGone: !(await ev(`!!document.querySelector("#onramp-heading")`)),
    rank: await ev(`document.querySelector('[aria-label$="account menu"]')?.getAttribute("aria-label")`),
  });
  await go("/achievements", 6000);
  await step("badges", {
    earned: await ev(`["Hello, World", "Bug Squasher", "Decision Maker", "In the Loop", "White Belt Tied"].filter((n) => document.body.innerText.includes(n))`),
  });

  // 6. An account with no age on record is asked in onboarding; under 16 gets the explanation
  await send("Network.clearBrowserCookies");
  db("noage", NOAGE);
  await go("/auth/signin", 5000);
  await fill("#email", NOAGE);
  await fill("#password", PASSWORD);
  await clickText("button[type=submit]", "Sign in");
  await waitFor(`location.pathname === "/onboarding"`, 60);
  await sleep(1500);
  const asked = await ev(`document.body.innerText.includes("How old are you?")`);
  await clickText("[role=radio]", "under 16");
  await sleep(800);
  await shot("4-under-16.png");
  await step("no-age-onboarding", {
    asked,
    fourQuestions: await ev(`document.body.innerText.includes("Four questions")`),
    under16: await ev(`document.body.innerText.includes("pylearn is for people 16 and over")`),
    deleteOffered: await ev(`[...document.querySelectorAll("button")].some((b) => b.textContent.includes("Delete my account"))`),
    axe: await axe(),
  });
} catch (e) {
  report.push({ step: "crashed", error: String(e) });
} finally {
  report.push({ step: "cleanup", result: db("cleanup", EMAIL, NOAGE) });
  for (const r of report) console.log(JSON.stringify(r));
  ws.close();
  chrome.kill();
  process.exit(0);
}
