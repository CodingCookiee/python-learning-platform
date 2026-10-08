// Dev-only: the landing page's "Try it" sandbox, signed out, for real.
//   BASE=http://localhost:3010 node .impeccable/landing-e2e.mjs
// Each theme: run the line, see the real error, fix it, pass the test, the stripe on the belt ladder.
// Then phone width. axe on the page at each stop. Screenshots in .impeccable/review/landing/.
import { execSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/landing/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";
const PORT = 9339;
const stamp = Date.now();
const NEW = `landing-new-${stamp}@example.invalid`;
const DEV = `landing-dev-${stamp}@example.invalid`;
const PASSWORD = "E2e-Landing-2026";
// Throwaway accounts only; the quest helper's cleanup deletes by email
const cleanup = (...emails) => execSync(`npx tsx .impeccable/quest-e2e-db.ts cleanup ${emails.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-landing", "about:blank"]);
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
  // While Fetch interception is on (the blocked-Python check), every matched request fails
  if (m.method === "Fetch.requestPaused") {
    ws.send(JSON.stringify({ id: ++id, method: "Fetch.failRequest", params: { requestId: m.params.requestId, errorReason: "BlockedByClient" } }));
    return;
  }
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") issues.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  else if (m.method === "Runtime.exceptionThrown") issues.push("EXC " + m.params.exceptionDetails.text + " " + (m.params.exceptionDetails.exception?.description ?? "").slice(0, 200));
  else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") issues.push("LOG " + m.params.entry.text.slice(0, 300));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
const desktop = () => send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const phone = () => send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const theme = (value) => send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value }] });
await send("Network.clearBrowserCookies");

const go = async (path, wait = 5000) => { await send("Page.navigate", { url: BASE + path }); await sleep(wait); };
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };
const clickText = (selector, text) => ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.includes(${JSON.stringify(text)})); el?.click(); return !!el; })()`);
const shot = async (name, clip) => {
  const res = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}) });
  writeFileSync(new URL(name, OUT), Buffer.from(res.result.data, "base64"));
};
const heroClip = async () => ev(`(() => { const r = document.querySelector("#hero-heading").closest("section").getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY), width: innerWidth, height: Math.round(r.height) }; })()`);
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const axe = async () => {
  await ev(axeSource);
  return ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then(r => r.violations.map(v => v.id + " (" + v.nodes.length + "): " + v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(", ")))`);
};
const report = [];
const step = async (name, data = {}) => { report.push({ step: name, ...data, errors: [...new Set(issues.splice(0))] }); };

const SANDBOX = `document.querySelector("section[aria-labelledby=try-it-heading]")`;
/** Press a sandbox button by its exact label, once Python has loaded */
const press = async (label) => {
  await waitFor(`![...${SANDBOX}.querySelectorAll("button")].some((b) => b.textContent.includes("Loading Python"))`, 120);
  return ev(`(() => { const b = [...${SANDBOX}.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(label)}); b?.click(); return !!b; })()`);
};
const sandboxText = () => ev(`${SANDBOX}?.innerText ?? ""`);
const live = () => ev(`${SANDBOX}?.querySelector("[aria-live]")?.textContent`);
const setFix = (code) => ev(`(() => { const el = document.querySelector("#try-it-code"); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, ${JSON.stringify(code)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);

/** The three steps for real; `label` names the screenshots */
async function sandbox(label) {
  await go("/", 6000);
  const ladderBefore = await ev(`document.body.innerText.includes("Stripe earned")`);
  // Point at the frame: Python starts downloading before the first Run
  const box = await ev(`(() => { const r = ${SANDBOX}.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 40 }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await sleep(300);
  const warmedOnHover = await ev(`[...${SANDBOX}.querySelectorAll("button")].some((b) => b.textContent.includes("Loading Python"))`);
  await press("Run");
  const ran = await waitFor(`${SANDBOX}.innerText.includes("Printed") && ${SANDBOX}.innerText.includes("Hello!")`, 120);
  await shot(`${label}-1-run.png`, await heroClip());
  const announced1 = await live();

  await press("Next");
  await sleep(500);
  const focusedHeading = await ev(`document.activeElement?.textContent`);
  const nextLocked = await ev(`[...${SANDBOX}.querySelectorAll("button")].find((b) => b.textContent.includes("Next"))?.disabled`);
  await press("Run");
  const errored = await waitFor(`${SANDBOX}.innerText.includes("SyntaxError")`, 60);
  await shot(`${label}-2-error.png`, await heroClip());
  const errorText = await ev(`${SANDBOX}.querySelector("pre")?.textContent`);

  await setFix('print("Welcome to the cafe!")');
  await press("Run tests");
  await waitFor(`${SANDBOX}.innerText.includes("not ")`, 40);
  const wrongReason = await ev(`${SANDBOX}.innerText.match(/It printed[^\\n]*/)?.[0]`);

  await setFix('print("Welcome to the café!")');
  await press("Run tests");
  const passed = await waitFor(`${SANDBOX}.innerText.includes("passed")`, 40);
  const announced2 = await live();
  const step3 = await waitFor(`${SANDBOX}.innerText.includes("Make it count")`, 20);
  await sleep(1500);
  const stripe = await ev(`document.body.innerText.includes("Stripe earned")`);
  await shot(`${label}-3-stripe.png`, await heroClip());
  const signup = await ev(`[...${SANDBOX}.querySelectorAll("a")].find((a) => a.textContent.includes("Sign up free"))?.getAttribute("href")`);
  await sleep(2000);
  const seal = await ev(`(() => { const s = ${SANDBOX}.querySelector("[role=img][aria-label^=Passed]"); if (!s) return null; const c = getComputedStyle(s); return { opacity: c.opacity, filter: c.filter, color: c.color, animation: c.animationName, visible: s.getBoundingClientRect().width > 0 }; })()`);
  await step(`${label}: sandbox`, {
    warmedOnHover,
    ran,
    announced1,
    focusedHeading,
    nextLockedBeforePass: nextLocked,
    errored,
    errorText,
    wrongReason,
    passed,
    announced2,
    step3,
    stripeBefore: ladderBefore,
    stripe,
    signup,
    seal,
    hero: await ev(`document.querySelector("#hero-heading").closest("section").innerText.split("\\n").slice(0, 6).join(" | ")`),
    waysIn: await ev(`[...document.querySelector("#hero-heading").closest("section").querySelectorAll("a")].map((a) => a.textContent.trim() + " -> " + a.getAttribute("href"))`),
    axe: await axe(),
  });
}

/** The whole page: order, the FAQ and its structured data, keyboard, a full-length screenshot */
async function page(label) {
  await go("/", 6000);
  const headings = await ev(`[...document.querySelectorAll("main h2")].map((h) => h.textContent.trim())`);
  const ld = await ev(`(() => { try { return JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent); } catch (e) { return String(e); } })()`);
  const questions = await ev(`[...document.querySelectorAll("#faq summary")].map((s) => s.textContent.trim())`);
  const time = await ev(`[...document.querySelectorAll("#faq details")].find((d) => d.innerText.includes("How long"))?.querySelector("p")?.textContent`);
  // Keyboard: tab to the first question and press Enter
  await ev(`document.querySelector("#faq summary").focus()`);
  // A real Enter press carries its character, which is what activates a summary
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: String.fromCharCode(13) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(300);
  const opened = await ev(`document.querySelector("#faq details").open`);
  const h = await ev("document.documentElement.scrollHeight");
  const w = await ev("innerWidth");
  await shot(`${label}-page.png`, { x: 0, y: 0, width: w, height: Math.min(h, 12000) });
  await step(`${label}: page`, {
    headings,
    ldMatches: typeof ld === "object" && JSON.stringify(ld.mainEntity.map((q) => q.name)) === JSON.stringify(questions),
    ldType: ld?.["@type"],
    time,
    keyboardOpens: opened,
    waysIn: await ev(`[...document.querySelectorAll("main a")].filter((a) => /never coded|already code|Start free|Sign up free|already have/.test(a.textContent)).map((a) => a.textContent.trim() + " -> " + a.getAttribute("href"))`),
    overflow: await ev(`document.documentElement.scrollWidth > innerWidth`),
    axe: await axe(),
  });
}

/** Python can't start (the worker and the CDN blocked): each step says what it would print */
async function fallback() {
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Fetch.enable", { patterns: [{ urlPattern: "*python-worker.mjs*" }, { urlPattern: "*cdn.jsdelivr.net/pyodide*" }] });
  await go("/", 6000);
  await press("Run");
  const note = await waitFor(`${SANDBOX}.innerText.includes("couldn't start")`, 60);
  const printed = await ev(`${SANDBOX}.innerText.includes("Hello!")`);
  await press("Next");
  await sleep(400);
  await press("Run");
  await sleep(800);
  const error = await ev(`${SANDBOX}.innerText.includes("SyntaxError")`);
  const fixedShown = await ev(`${SANDBOX}.innerText.includes("With the quote added")`);
  const nextOpen = await ev(`[...${SANDBOX}.querySelectorAll("button")].find((b) => b.textContent.includes("Next"))?.disabled === false`);
  await press("Next");
  await sleep(400);
  const signup = await ev(`[...${SANDBOX}.querySelectorAll("a")].find((a) => a.textContent.includes("Sign up free"))?.getAttribute("href")`);
  await shot("fallback.png", await heroClip());
  await send("Fetch.disable");
  await send("Network.setCacheDisabled", { cacheDisabled: false });
  issues.splice(0); // the blocked requests' own console errors are the point of this check
  const line = await ev(`${SANDBOX}.querySelector("p[tabindex]")?.nextElementSibling?.textContent`);
  await step("python blocked", { note, printed, error, fixedShown, nextOpen, signup, line, axe: await axe() });
}

/** A way in, through a real sign-up, to onboarding's first question */
async function wayIn(label, email, button) {
  await send("Network.clearBrowserCookies");
  await go("/", 6000);
  const href = await ev(`[...document.querySelector("#hero-heading").closest("section").querySelectorAll("a")].find((a) => a.textContent.includes(${JSON.stringify(button)}))?.getAttribute("href")`);
  await ev(`[...document.querySelector("#hero-heading").closest("section").querySelectorAll("a")].find((a) => a.textContent.includes(${JSON.stringify(button)})).click()`);
  await waitFor(`location.pathname === "/auth/signup"`, 30);
  await sleep(2500);
  const remembered = await ev(`localStorage.getItem("pylearn:start")`);
  const fillIn = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await fillIn("#name", `Landing ${label}`);
  await fillIn("#email", email);
  await fillIn("#password", PASSWORD);
  await fillIn("#confirmPassword", PASSWORD);
  await ev(`document.querySelector("#ageConfirmed").click()`);
  await clickText("button[type=submit]", "Create account");
  const onboarding = await waitFor(`location.pathname === "/onboarding"`, 60);
  await sleep(2000);
  const selected = await ev(`[...document.querySelectorAll('[role=radiogroup][aria-label=Experience] [role=radio]')].find((r) => r.getAttribute("aria-checked") === "true")?.querySelector("span")?.textContent ?? null`);
  await shot(`waysin-${label}.png`);
  const onboardingAxe = await axe();
  // Finish onboarding: the remembered answer is forgotten once saved
  if (!selected) await clickText("[role=radio]", "I code in another language");
  await clickText("[role=radio]", "Advanced Python");
  await clickText("button", "Start training");
  await waitFor(`location.pathname !== "/onboarding"`, 60);
  await sleep(2500);
  await step(`way in: ${label}`, {
    href,
    remembered,
    onboarding,
    selected,
    landedOn: await ev("location.pathname"),
    forgotten: (await ev(`localStorage.getItem("pylearn:start")`)) === null,
    axe: onboardingAxe,
  });
}

try {
  if (process.env.ONLY === "fallback") {
    await desktop();
    await fallback();
    throw "done";
  }
  if (process.env.ONLY === "sections") {
    await desktop();
    for (const t of ["light", "dark"]) {
      await theme(t);
      await go("/", 6000);
      for (const id of ["how-heading", "who-heading", "faq-heading"]) {
        await ev(`scrollTo(0, document.getElementById("${id}").getBoundingClientRect().top + scrollY - 90)`);
        await sleep(600);
        await shot(`${t}-${id}.png`);
      }
    }
    throw "done";
  }
  if (process.env.ONLY === "page") {
    await desktop();
    await theme("light");
    await page("light");
    await theme("dark");
    await page("dark");
    await theme("light");
    await phone();
    await page("phone");
    throw "done";
  }
  await desktop();
  await theme("light");
  await sandbox("light");
  if (process.env.ONLY !== "light") {
    await theme("dark");
    await sandbox("dark");
  }
  await theme("light");
  await phone();
  await go("/", 6000);
  await shot("phone-1-hero.png");
  // Below the sticky navbar
  await ev(`scrollTo(0, ${SANDBOX}.getBoundingClientRect().top + scrollY - 72)`);
  await sleep(500);
  await shot("phone-2-sandbox.png");
  await step("phone", {
    overflow: await ev(`document.documentElement.scrollWidth > innerWidth`),
    axe: await axe(),
  });
  await desktop();
  await fallback();
  await wayIn("never coded", NEW, "I've never coded");
  await wayIn("already code", DEV, "I already code");
} catch (e) {
  if (e !== "done") report.push({ step: "crashed", error: String(e && e.stack || e) });
} finally {
  if (!["sections", "page", "light", "fallback"].includes(process.env.ONLY)) {
    report.push({ step: "cleanup", result: cleanup(NEW, DEV) });
  }
  for (const r of report) console.log(JSON.stringify(r));
  ws.close();
  chrome.kill();
  process.exit(0);
}
