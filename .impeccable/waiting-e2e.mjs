// Dev-only: the app's waiting states, for real in the browser (docs/superpowers/plans/2026-10-08-waiting-states-plan.md).
//   BASE=http://localhost:3010 [ONLY=phase3,phase4,signedout,fixes,clipboard,examiner] node .impeccable/waiting-e2e.mjs
// (ONLY=clipboard: the checkpoint clipboard lock, not a waiting state, but the same harness)
// Slow steps are made visible by holding the browser's requests back (Fetch interception), and a
// dropped connection is simulated by failing one. A throwaway learner, deleted at the end.
import { execSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/waiting/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";
const PORT = 9342;
const EMAIL = `waiting-${Date.now()}@example.invalid`;
const PASSWORD = "E2e-Quest-2026";

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-waiting", "about:blank"]);
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
// Every request the page sends (to count refreshes)
const requests = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Fetch.requestPaused") return void paused.push(m.params);
  if (m.method === "Network.requestWillBeSent") return void requests.push(m.params.request.url);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") issues.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
  else if (m.method === "Runtime.exceptionThrown") issues.push("EXC " + m.params.exceptionDetails.text + " " + (m.params.exceptionDetails.exception?.description ?? "").slice(0, 200));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
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
const step = (name, data = {}) => report.push({ step: name, ...data, errors: [...new Set(issues.splice(0))] });

/** Hold matching requests until released (or fail them) */
async function intercept(pattern) {
  paused.length = 0;
  await send("Fetch.enable", { patterns: [{ urlPattern: pattern, requestStage: "Request" }] });
}
async function release(how = "continue") {
  for (const p of paused.splice(0)) {
    if (how === "fail") await send("Fetch.failRequest", { requestId: p.requestId, errorReason: "ConnectionFailed" });
    else await send("Fetch.continueRequest", { requestId: p.requestId });
  }
}
const stopIntercepting = () => send("Fetch.disable");
/** Answer the held requests with this JSON instead of letting them reach the server */
async function fulfill(json) {
  for (const p of paused.splice(0)) {
    await send("Fetch.fulfillRequest", {
      requestId: p.requestId,
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(JSON.stringify(json)).toString("base64"),
    });
  }
}
/** Dismiss achievement and level-up dialogs one by one, as a learner would; their titles */
async function dismissCelebrations(tries = 20) {
  const seen = [];
  for (let i = 0; i < tries; i++) {
    const look = await ev(`[...document.querySelectorAll("[role=dialog]")].map((d) => d.innerText.split("\\n").filter(Boolean).slice(0, 2).join(" / ") + " [" + [...d.querySelectorAll("button")].map((b) => b.textContent.trim()).join(",") + "]").join(" || ")`);
    const clicked = await clickText("[role=dialog] button", "Keep training");
    seen.push((clicked ? "clicked: " : "saw: ") + (look || "nothing"));
    await sleep(700);
  }
  return seen;
}

const STATUS = `document.querySelector("[data-quest-target=run-tests]")?.closest("div")?.querySelector(".ml-auto")?.innerText ?? ""`;
const BUTTON = `document.querySelector("[data-quest-target=run-tests]")?.innerText ?? ""`;
const BANNER = `[...document.querySelectorAll("div")].find((d) => d.className.includes("bg-accent/55"))?.innerText ?? ""`;
const PREDICT_BOX = `document.querySelector("textarea[placeholder^='Type the output']")`;
/** Type into the predict box (a controlled textarea) */
const typeAnswer = (text) => ev(`(() => { const el = ${PREDICT_BOX}; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
async function setSolution(drillId) {
  const drill = JSON.parse(db("drill", drillId));
  if (drill.type === "predict") {
    // The answer is what the code prints: run it here (trusted repo content), isolated
    const output = execSync("python -I -", { input: drill.solution, encoding: "utf8" }).replace(/\r/g, "").replace(/\n$/, "");
    await waitFor(`!!${PREDICT_BOX}`, 60);
    await typeAnswer(output);
    return;
  }
  await waitFor(`!!window.monaco?.editor?.getEditors?.().length`, 60);
  await ev(`(() => { const ed = window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)); ed.setValue(${JSON.stringify(drill.solution)}); })()`);
}

async function signIn() {
  // A session left over from an earlier run belongs to an account that run deleted
  await send("Network.clearBrowserCookies");
  db("existing", EMAIL);
  await go("/auth/signin", 5000);
  await fill("#email", EMAIL);
  await fill("#password", PASSWORD);
  await clickText("button[type=submit]", "Sign in");
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await sleep(2000);
}

async function phase1() {
  // Python's phases on a fresh load (the browser cache is cleared first)
  await send("Network.clearBrowserCache");
  const drillId = db("drill-id", "hello-pylearn");
  await send("Page.navigate", { url: `${BASE}/exercises/${drillId}` });
  const phases = new Set();
  for (let i = 0; i < 120; i++) {
    const text = await ev(STATUS);
    if (text) phases.add(text.split("\n")[0]);
    await sleep(100);
  }
  await shot("1-drill-ready.png");
  step("python phases", { phases: [...phases], button: await ev(BUTTON) });

  // A pass whose save is held: the button, the banner, then Next drill waiting for it
  await setSolution(drillId);
  await sleep(3200);
  const draft = await ev(STATUS);
  await intercept("*/api/exercises/*/submit*");
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  const running = [];
  for (let i = 0; i < 8; i++) {
    running.push(await ev(BUTTON));
    await sleep(150);
  }
  await waitFor(`/tests passed/.test(document.body.innerText)`, 60);
  await sleep(1200);
  const whileSaving = { button: await ev(BUTTON), banner: await ev(BANNER) };
  await shot("2-saving.png");
  const savingAxe = await axe();
  await clickText("a", "Next drill");
  await sleep(600);
  const nextWhileSaving = await ev(`[...document.querySelectorAll("a")].find((a) => a.textContent.includes("Saving your pass"))?.getAttribute("aria-busy")`);
  const stayed = await ev("location.pathname");
  await sleep(3000);
  const stillSaving = await ev(BANNER);
  await shot("3-saving-long.png");
  const heldCount = paused.length;
  const releasedAt = Date.now();
  await release();
  await stopIntercepting();
  const saved = await waitFor(`/\\+\\d+ XP/.test(${BANNER})`, 60);
  const saveMs = Date.now() - releasedAt;
  await sleep(800);
  const celebrations = await dismissCelebrations(6);
  await waitFor(`location.pathname !== ${JSON.stringify(stayed)}`, 20);
  step("drill pass, slow save", {
    draft,
    running: [...new Set(running)],
    whileSaving,
    nextWhileSaving,
    stayedWhileSaving: stayed === `/exercises/${drillId}`,
    stillSaving,
    heldCount,
    saved,
    saveMs,
    celebrations,
    movedOnTo: await ev("location.pathname"),
    axe: savingAxe,
  });

  // A save that drops: the message and Try again
  const second = (await ev("location.pathname")).split("/").pop();
  await sleep(2500);
  await setSolution(second);
  await intercept("*/api/exercises/*/submit*");
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  await waitFor(`/tests passed/.test(document.body.innerText)`, 60);
  await sleep(800);
  await release("fail");
  await stopIntercepting();
  await sleep(1500);
  const failed = { text: await ev(`document.body.innerText.match(/This attempt didn.t save[^\\n]*/)?.[0]`), banner: await ev(BANNER) };
  await shot("4-save-failed.png");
  await clickText("button", "Try again");
  const retried = await waitFor(`/XP/.test(${BANNER}) || /Saved/.test(document.body.innerText)`, 30);
  await sleep(1000);
  step("drill pass, dropped save", { failed, retried, banner: await ev(BANNER), announced: await ev(`[...document.querySelectorAll("p.sr-only[aria-live]")].map((p) => p.textContent).join(" | ")`) });
}

/** Watch an element's text for a while; the distinct lines it showed */
async function watch(expr, ms, every = 120) {
  const seen = new Set();
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const text = await ev(expr);
    for (const line of String(text ?? "").split("\n").map((l) => l.trim()).filter(Boolean)) seen.add(line);
    await sleep(every);
  }
  return [...seen];
}

async function phase2() {
  // Lesson examples: the first run names Python's phases in the example's own output
  await send("Network.clearBrowserCache");
  db("pass-lesson", EMAIL, "running-python");
  const lesson = db("lesson-id", "running-python");
  await go(`/lessons/${lesson}`, 6000);
  const EXAMPLE = `document.querySelector("[data-quest-target=run-example]")?.closest(".my-6")`;
  await ev(`${EXAMPLE}.scrollIntoView({ block: "center" })`);
  await ev(`document.querySelector("[data-quest-target=run-example]").click()`);
  const example = await watch(`${EXAMPLE}?.innerText`, 9000);
  await shot("p2-1-example.png");
  step("lesson example, first run", { lines: example.filter((l) => /…|Printed|Value|Afterwards/.test(l)) });

  // The scratchpad: "Running…" and its output line
  await ev(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Open scratchpad"))?.click()`);
  await waitFor(`!!document.querySelector("#scratchpad")`, 20);
  await sleep(1500);
  await ev(`document.querySelector("#scratchpad [data-quest-target=scratchpad], #scratchpad button[aria-busy]")?.click() ?? [...document.querySelectorAll("#scratchpad button")].find((b) => b.textContent.trim() === "Run")?.click()`);
  const pad = await watch(`document.querySelector("#scratchpad")?.innerText`, 2500, 80);
  step("scratchpad run", { lines: pad.filter((l) => /Run|…|Printed|Ran/.test(l)) });
  await ev(`document.querySelector("[aria-label='Close scratchpad']")?.click()`);
  await sleep(500);

  // Mark lesson complete, with the save held: saving, then where it's taking you
  await ev(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Mark lesson complete"))?.scrollIntoView({ block: "center" })`);
  await intercept("*/api/progress/lesson*");
  await clickText("button", "Mark lesson complete");
  const COMPLETE = `[...document.querySelectorAll("button")].find((b) => /Mark lesson complete|Saving|Lesson complete/.test(b.textContent))?.closest("div.flex-col")`;
  const savingLesson = await watch(`${COMPLETE}?.innerText`, 2500);
  const busy = await ev(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Saving"))?.getAttribute("aria-busy")`);
  await shot("p2-2-lesson-saving.png");
  const here = await ev("location.pathname");
  await release();
  await stopIntercepting();
  const after = await watch(`${COMPLETE}?.innerText`, 1500);
  const celebrations = [];
  for (let i = 0; i < 40 && (await ev("location.pathname")) === here; i++) {
    if (await clickText("[role=dialog] button", "Keep training")) celebrations.push("dismissed one");
    await sleep(500);
  }
  step("lesson complete", { saving: savingLesson, busy, after, celebrations, movedOnTo: await ev("location.pathname") });

  // A checkpoint: the draw, its loading screen, then handing in
  const moduleId = db("module-id", "1");
  await go(`/modules/${moduleId}`, 6000);
  await intercept("*/api/checkpoints");
  const startLabel = await ev(`[...document.querySelectorAll("button")].find((b) => /checkpoint|Test out/i.test(b.textContent))?.textContent`);
  await ev(`[...document.querySelectorAll("button")].find((b) => /checkpoint|Test out/i.test(b.textContent))?.click()`);
  await sleep(1200);
  const drawing = await ev(`[...document.querySelectorAll("button[aria-busy=true]")].map((b) => b.innerText).join(" | ")`);
  await shot("p2-3-drawing.png");
  await release();
  await stopIntercepting();
  const loadingScreen = await watch(`document.querySelector("main [role=status]")?.innerText`, 1500, 60);
  await waitFor(`location.pathname.startsWith("/checkpoints/")`, 30);
  await sleep(2500);
  await clickText("button", "Hand in");
  await sleep(500);
  await intercept("*/hand-in*");
  await ev(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Hand in")?.click()`);
  await sleep(1000);
  const marking = await ev(`[...document.querySelectorAll("button[aria-busy=true]")].map((b) => b.innerText).join(" | ")`);
  await shot("p2-4-marking.png");
  await release();
  await stopIntercepting();
  const closed = await waitFor(`![...document.querySelectorAll("button")].some((b) => /Hand in|Marking/.test(b.textContent)) && /Try a fresh set|fresh set of drills|Back to the module/.test(document.querySelector("main")?.innerText ?? "")`, 40);
  const result = await ev(`document.querySelector("main h1")?.closest("div")?.innerText.split("\\n").slice(0, 4).join(" | ")`);
  step("checkpoint", { startLabel, drawing, loadingScreen, marking, closed, result, at: await ev("location.pathname") });

  // The review queue's loading screen, from a link click
  await ev(`[...document.querySelectorAll("header a")].find((a) => a.textContent.trim() === "Review")?.click()`);
  const reviewLoading = await watch(`document.querySelector("main [role=status]")?.innerText`, 1500, 50);
  await waitFor(`location.pathname === "/review"`, 20);
  step("review queue", { loadingScreen: reviewLoading, at: await ev("location.pathname"), axe: await axe() });
}

/** A real mouse click (pointer events too, which Radix menus open on) at an element's centre */
async function realClick(expr) {
  const box = await ev(`(() => { const el = ${expr}; if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  if (!box) return false;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
  return true;
}
const busyButtons = () => ev(`[...document.querySelectorAll("button[aria-busy=true]")].map((b) => b.innerText.trim()).join(" | ")`);

async function phase3() {
  // Sign in again (the account exists already) with the session request held: "Signing in…", then
  // "Opening your dashboard…" until it arrives
  await send("Network.clearBrowserCookies");
  await go("/auth/signin", 5000);
  await fill("#email", EMAIL);
  await fill("#password", PASSWORD);
  await intercept("*/api/auth/callback/credentials*");
  await clickText("button[type=submit]", "Sign in");
  await sleep(1000);
  const signingIn = await busyButtons();
  await shot("p3-1-signing-in.png");
  await release();
  await stopIntercepting();
  const leaving = await watch(`location.pathname === "/auth/signin" ? document.querySelector("form button[type=submit]")?.innerText : "arrived at " + location.pathname`, 5000, 60);
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await sleep(2500);
  step("sign in", { signingIn, leaving });

  // The quest offer: "Starting…" while it saves, then a line until the dashboard has the quest
  const offered = await ev(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.includes("Start the quest")); if (!b) return false; b.closest("section").dataset.e2e = "offer"; return true; })()`);
  await intercept("*/api/quest/*");
  await clickText("button", "Start the quest");
  await sleep(900);
  const starting = await ev(`document.querySelector("[data-e2e=offer]")?.innerText.split("\\n").slice(-2).join(" / ")`);
  await shot("p3-2-quest-starting.png");
  await release();
  await stopIntercepting();
  const afterStart = await watch(`document.querySelector("[data-e2e=offer]")?.innerText.split("\\n").slice(-1)[0] ?? "offer gone"`, 5000, 80);
  step("quest offer", { offered, starting, afterStart });

  // Skipping the quest: the confirm dialog stays open saying "Skipping…" until it lands
  await sleep(1500);
  const skipOpened = await clickText("button", "Skip the quest");
  await sleep(700);
  await intercept("*/api/quest/skip*");
  const skipClicked = await clickText("[role=alertdialog] button", "Skip the quest");
  await sleep(800);
  const skipping = await ev(`document.querySelector("[role=alertdialog]")?.innerText.split("\\n").slice(-2).join(" / ")`);
  await shot("p3-3-skipping.png");
  await release();
  await stopIntercepting();
  const skipClosed = await waitFor(`!document.querySelector("[role=alertdialog]")`, 20);
  step("quest skip", { skipOpened, skipClicked, skipping, skipClosed });
  await go("/dashboard", 5000);

  // Search: "Searching the syllabus…" while the request is out, then the results and their count
  await ev(`[...document.querySelectorAll("header button")].find((b) => b.offsetParent && /Search/.test(b.innerText + (b.getAttribute("aria-label") ?? "")))?.click()`);
  await waitFor(`!!document.querySelector("input[aria-label='Search query']")`, 10);
  await intercept("*/api/search*");
  await fill("input[aria-label='Search query']", "list");
  await sleep(1300);
  const searching = await ev(`document.querySelector("[role=dialog][aria-label=Search]")?.innerText`);
  await shot("p3-4-searching.png");
  await release();
  await stopIntercepting();
  const released = Date.now();
  const settled = await waitFor(`!/Searching the syllabus/.test(document.querySelector("[role=dialog][aria-label=Search]")?.innerText ?? "")`, 40);
  const resultsAfterMs = Date.now() - released;
  const results = await ev(`document.querySelector("[role=dialog][aria-label=Search]")?.innerText.split("\\n").slice(0, 6).join(" | ")`);
  const announced = await ev(`document.querySelector("[role=dialog][aria-label=Search] [aria-live]")?.textContent`);
  step("search", { searching, settled, resultsAfterMs, results, announced, axe: await axe() });
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(500);

  // The learning log: refilling from this week's activity says so, then what it did
  await go("/log", 6000);
  await intercept("*/api/log*");
  await clickText("button", "Refill from this week");
  await sleep(800);
  const refilling = await busyButtons();
  await release();
  await stopIntercepting();
  await sleep(1500);
  const refilled = await ev(`[...document.querySelectorAll("[role=status], [aria-live]")].map((s) => s.textContent.trim()).filter(Boolean).join(" | ")`);
  step("log refill", { refilling, refilled });

  // Settings: saving the name, and testing a saved key (a dummy one; the test request is failed, so nothing leaves)
  await go("/settings", 6000);
  await fill("#settings-name", "Waiting Learner");
  await intercept("*/api/profile*");
  await clickText("button", "Save name");
  await sleep(800);
  const savingName = await busyButtons();
  await release();
  await stopIntercepting();
  await sleep(1500);
  const keyField = await ev(`!!document.querySelector("#ai-key")`);
  let keyTest = "no AI settings (ENCRYPTION_KEY unset)";
  if (keyField) {
    const prefix = await ev(`document.querySelector("#ai-key").placeholder.replace("…", "")`);
    await fill("#ai-key", `${prefix}e2e-dummy-key-0000000000000000000000000000`);
    await clickText("button[type=submit]", "Save key");
    await waitFor(`[...document.querySelectorAll("button")].some((b) => b.innerText.trim() === "Test")`, 20);
    await intercept("*/api/settings/ai/test*");
    await clickText("button", "Test");
    const testing = await watch(`[...document.querySelectorAll("[role=status]")].map((s) => s.innerText.trim()).filter(Boolean).join(" | ") + " || " + [...document.querySelectorAll("button[aria-busy=true]")].map((b) => b.innerText.trim()).join(",")`, 3500, 150);
    await shot("p3-5-key-test.png");
    await release("fail");
    await stopIntercepting();
    await sleep(1200);
    const answer = await ev(`[...document.querySelectorAll("[role=status], [role=alert]")].map((s) => s.textContent.trim()).filter(Boolean).join(" | ")`);
    keyTest = { testing, answer };
  }
  step("settings", { savingName, keyTest });

  // Onboarding (changing the plan): the choices lock while it saves
  await go("/onboarding", 6000);
  await intercept("*/api/onboarding*");
  await clickText("button", "Save my plan");
  await sleep(900);
  const savingPlan = await busyButtons();
  const lockedChoices = await ev(`document.querySelectorAll("main [aria-disabled=true]").length`);
  await shot("p3-6-saving-plan.png");
  await release();
  await stopIntercepting();
  await waitFor(`location.pathname === "/dashboard"`, 30);
  step("onboarding", { savingPlan, lockedChoices, movedTo: await ev("location.pathname") });
}

async function phase4() {
  // The bar and the loading screens: the next page's request is held after a link click
  const moves = process.env.MOVES === "none" ? [] : [
    { from: "/dashboard", link: `main a[href="/log"]` },
    { from: "/log", link: `header a[href="/achievements"]` },
    { from: "/achievements", link: `header a[href="/modules"]` },
    { from: "/modules", link: `main a[href^="/modules/"]` },
    { from: "/dashboard", link: `main a[href="/onboarding"]` },
    { from: "/log", link: `header a[href="/dashboard"]` },
    { from: "/dashboard", menu: "/profile" },
    { from: "/dashboard", menu: "/settings" },
  ];
  const BAR = `document.querySelector("[role=progressbar][aria-label='Loading the page']")`;
  let checkedAxe = false;
  for (const m of moves) {
    await go(m.from, 6000);
    if (m.menu) {
      await realClick(`document.querySelector("header button[aria-label$='ccount menu']")`);
      await waitFor(`!!document.querySelector("[role=menu] a[href='${m.menu}']")`, 10);
    } else {
      await ev(`document.querySelector(${JSON.stringify(m.link)})?.scrollIntoView({ block: "center" })`);
    }
    // Let the link's prefetch (which brings its loading screen) land first
    await sleep(2500);
    const linkSel = m.menu ? `[role=menu] a[href='${m.menu}']` : m.link;
    const href = await ev(`document.querySelector(${JSON.stringify(linkSel)})?.getAttribute("href")`);
    if (!href) {
      step(`move ${m.from} → ${m.menu ?? m.link}`, { error: "link not found" });
      continue;
    }
    await intercept(`*${href}?*`);
    await ev(`document.querySelector(${JSON.stringify(linkSel)}).click()`);
    await sleep(600);
    const bar = await ev(`${BAR} ? getComputedStyle(${BAR}).opacity : "none"`);
    const screen = await ev(`document.querySelector("main [role=status][aria-busy=true]")?.innerText.trim() ?? "none"`);
    const axeWhileLoading = !checkedAxe && screen !== "none" ? await axe() : undefined;
    if (axeWhileLoading) checkedAxe = true;
    await shot(`p4-${href.replace(/\W+/g, "-").slice(0, 30)}.png`);
    const heldAt = await ev("location.pathname");
    await release();
    await stopIntercepting();
    const arrived = await waitFor(`location.pathname === ${JSON.stringify(href)} && !document.querySelector("main [role=status][aria-busy=true]")`, 30);
    await sleep(400);
    const barAfter = await ev(`${BAR} ? "still showing" : "gone"`);
    step(`move ${m.from} → ${href}`, { bar, screen, heldAt, arrived, barAfter, ...(axeWhileLoading ? { axe: axeWhileLoading } : {}) });
  }

  // No loading screen to show yet (its prefetch is held too): the bar is the only sign, until the page lands
  await intercept("*/achievements?*");
  await go("/dashboard", 6000);
  await ev(`document.querySelector("header a[href='/achievements']").click()`);
  await sleep(700);
  const barAlone = await ev(`${BAR} ? getComputedStyle(${BAR}).opacity : "none"`);
  const stillOn = await ev("location.pathname");
  await shot("p4-bar-alone.png");
  await release();
  await sleep(300);
  await release();
  await stopIntercepting();
  const landed = await waitFor(`location.pathname === "/achievements" && !document.querySelector("main [role=status][aria-busy=true]")`, 30);
  await sleep(400);
  step("bar without a loading screen", { barAlone, stillOn, landed, barAfter: await ev(`${BAR} ? "still showing" : "gone"`) });

  // Back to where a move started: the bar mustn't come back
  await go("/dashboard", 6000);
  await ev(`document.querySelector("header a[href='/review']").click()`);
  await waitFor(`location.pathname === "/review"`, 30);
  await sleep(1000);
  await send("Runtime.evaluate", { expression: "history.back()" });
  await waitFor(`location.pathname === "/dashboard"`, 30);
  await sleep(800);
  step("back after a move", { bar: await ev(`${BAR} ? "showing" : "none"`) });
}

/** Signed out: signing out, then the sign-up and forgot-password forms */
async function signedOut() {
  // Signing out: the menu stays open and says so
  await go("/dashboard", 6000);
  await realClick(`document.querySelector("header button[aria-label$='ccount menu']")`);
  await waitFor(`!!document.querySelector("[role=menu]")`, 10);
  await intercept(`${BASE}/dashboard`);
  await realClick(`[...document.querySelectorAll("[role=menu] button")].find((b) => b.innerText.includes("Sign out"))`);
  await sleep(900);
  const signingOut = await ev(`document.querySelector("[role=menu]")?.innerText.split("\\n").slice(-1)[0] ?? "menu closed"`);
  const bar = await ev(`document.querySelector("[role=progressbar][aria-label='Loading the page']") ? "showing" : "none"`);
  await shot("p3-7-signing-out.png");
  await release();
  await stopIntercepting();
  await waitFor(`!location.pathname.startsWith("/dashboard")`, 30);
  step("sign out", { signingOut, bar, at: await ev("location.pathname") });

  // Sign-up: "Creating your account…" with its lines, then where it's taking you
  const NEW = `waiting-signup-${Date.now()}@example.invalid`;
  await send("Network.clearBrowserCookies");
  await go("/auth/signup", 5000);
  await fill("#name", "Waiting Signup");
  await fill("#email", NEW);
  await fill("#password", PASSWORD);
  await fill("#confirmPassword", PASSWORD);
  await ev(`document.querySelector("#ageConfirmed")?.click()`);
  await intercept("*/api/auth/register*");
  await ev(`document.querySelector("form button[type=submit]").click()`);
  const creating = await watch(`[...document.querySelectorAll("button[aria-busy=true], form [role=status]")].map((s) => s.innerText.trim()).join(" | ")`, 2600, 120);
  await shot("p3-8-signing-up.png");
  await release();
  await stopIntercepting();
  const leaving = await watch(`location.pathname === "/auth/signup" ? document.querySelector("form button[type=submit]")?.innerText : "arrived at " + location.pathname`, 6000, 60);
  step("sign up", { creating, leaving, cleanup: db("cleanup", NEW) });

  // Forgot password: "Sending the link…" (the request is failed, so no email goes out)
  await send("Network.clearBrowserCookies");
  await go("/auth/forgot-password", 5000);
  await fill("#forgot-email", EMAIL);
  await intercept("*/api/auth/password/forgot*");
  await ev(`document.querySelector("form button[type=submit]").click()`);
  await sleep(800);
  const sending = await busyButtons();
  const emailLocked = await ev(`document.querySelector("#forgot-email").readOnly`);
  await release("fail");
  await stopIntercepting();
  await sleep(1000);
  const failed = await ev(`[...document.querySelectorAll("[role=alert]")].map((s) => s.textContent.trim()).join(" | ")`);
  step("forgot password", { sending, emailLocked, failed });
}

/** The review's fixes (2026-10-09): nothing a save, search, skip or clock leaves spinning */
async function fixes() {
  const drillId = db("drill-id", "hello-pylearn");
  const SUBMIT = "*/api/exercises/*/submit*";
  const saved = (over) => ({
    mode: "practice",
    grading: "client",
    gradingDisagreed: false,
    submission: { attempts: 1, passed: true },
    xpGained: 0,
    newlySolved: false,
    achievements: [],
    review: null,
    checkpoint: null,
    ...over,
  });
  const NEXT_IN_BANNER = `[...document.querySelectorAll("div")].find((d) => d.className.includes("bg-accent/55"))?.querySelector("a")`;

  if (process.env.CLOCK_ONLY) return clockAhead();
  // A. Saved, but the checkpoint had closed: "Next drill" (pressed during the save) settles, the page stays
  await go(`/exercises/${drillId}`, 6000);
  await setSolution(drillId);
  await intercept(SUBMIT);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  const passedA = await waitFor(`/Drill passed/.test(${BANNER})`, 90);
  await ev(`${NEXT_IN_BANNER}?.click()`);
  await sleep(600);
  const holdingA = await ev(`${NEXT_IN_BANNER}?.innerText.trim()`);
  await fulfill(saved({ checkpoint: { error: "This checkpoint has closed." } }));
  await stopIntercepting();
  await sleep(2500);
  step("save with a checkpoint error", {
    passedA,
    holdingA,
    linkAfter: await ev(`${NEXT_IN_BANNER}?.innerText.trim() + " | aria-busy=" + ${NEXT_IN_BANNER}?.getAttribute("aria-busy")`),
    stayed: await ev(`location.pathname === ${JSON.stringify(`/exercises/${drillId}`)}`),
    message: await ev(`document.body.innerText.includes("This checkpoint has closed.")`),
  });

  // B. The server overruled the pass: the bottom "next" link (pressed during the save) settles, the page stays
  await go(`/exercises/${drillId}`, 6000);
  await setSolution(drillId);
  await intercept(SUBMIT);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  const passedB = await waitFor(`/Drill passed/.test(${BANNER})`, 90);
  const BOTTOM_NEXT = `[...document.querySelectorAll("nav[aria-label=Drills] a")].at(-1)`;
  await ev(`${BOTTOM_NEXT}.click()`);
  await sleep(600);
  const holdingB = await ev(`${BOTTOM_NEXT}.getAttribute("aria-busy")`);
  await fulfill(saved({ gradingDisagreed: true, submission: { attempts: 2, passed: false } }));
  await stopIntercepting();
  await sleep(2500);
  step("save the server overruled", {
    passedB,
    holdingB,
    busyAfter: await ev(`${BOTTOM_NEXT}.getAttribute("aria-busy") ?? "none"`),
    spinnerAfter: await ev(`!!${BOTTOM_NEXT}.querySelector(".animate-spin")`),
    stayed: await ev(`location.pathname === ${JSON.stringify(`/exercises/${drillId}`)}`),
    bannerGone: await ev(`!/Drill passed/.test(${BANNER})`),
    message: await ev(`document.body.innerText.includes("The server re-ran the tests and not all of them passed")`),
  });

  // C. A search that fails clears the last results instead of leaving them under the error
  await go("/dashboard", 6000);
  await ev(`[...document.querySelectorAll("header button")].find((b) => b.offsetParent && /Search/.test(b.innerText + (b.getAttribute("aria-label") ?? "")))?.click()`);
  await waitFor(`!!document.querySelector("input[aria-label='Search query']")`, 10);
  await fill("input[aria-label='Search query']", "list");
  const firstResults = await waitFor(`!!document.querySelector("[role=dialog][aria-label=Search] [role=listbox]")`, 40);
  await intercept("*/api/search*");
  await fill("input[aria-label='Search query']", "lists");
  await sleep(1000);
  await release("fail");
  await stopIntercepting();
  await sleep(800);
  step("search that fails", {
    firstResults,
    staleResults: await ev(`!!document.querySelector("[role=dialog][aria-label=Search] [role=listbox]")`),
    error: await ev(`document.querySelector("[role=dialog][aria-label=Search]")?.innerText.includes("Search isn't working right now")`),
  });
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(500);

  // D. Slow code in the scratchpad: "still running", not "the first run downloads Python"
  const lesson = db("lesson-id", "running-python");
  await go(`/lessons/${lesson}`, 6000);
  await ev(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes("Open scratchpad"))?.click()`);
  await waitFor(`!!document.querySelector("#scratchpad") && !!window.monaco?.editor?.getEditors?.().length`, 40);
  await sleep(1000);
  await ev(`window.monaco.editor.getEditors().at(-1).setValue("import time\\ntime.sleep(9.5)\\nprint('done')")`);
  await ev(`document.querySelector("#scratchpad [data-quest-target=scratchpad]").click()`);
  const pad = await watch(`document.querySelector("#scratchpad")?.innerText`, 21000, 250);
  step("slow scratchpad code", { lines: pad.filter((l) => /…|still|downloads|done|Python/i.test(l)) });

  // E. Skipping the quest when the skip doesn't land: the dialog stays and says so; trying again works
  await go("/dashboard", 6000);
  await clickText("button", "Start the quest");
  await waitFor(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("Skip the quest"))`, 30);
  await sleep(1000);
  await clickText("button", "Skip the quest");
  await waitFor(`!!document.querySelector("[role=alertdialog]")`, 10);
  await intercept("*/api/quest/skip*");
  await clickText("[role=alertdialog] button", "Skip the quest");
  await sleep(700);
  await release("fail");
  await stopIntercepting();
  await sleep(800);
  const failedSkip = await ev(`document.querySelector("[role=alertdialog]")?.innerText.split("\\n").filter(Boolean).slice(-3).join(" / ") ?? "dialog closed"`);
  await shot("fix-skip-failed.png");
  await clickText("[role=alertdialog] button", "Skip the quest");
  const retried = await waitFor(`!document.querySelector("[role=alertdialog]")`, 20);
  step("quest skip that fails", { failedSkip, retriedAndClosed: retried });

  await clockAhead();
}

/** F. A clock that runs ahead of the server's: it keeps asking, and the page closes once the server agrees */
async function clockAhead() {
  const moduleId = db("module-id", "1");
  await go(`/modules/${moduleId}`, 6000);
  await ev(`[...document.querySelectorAll("button")].find((b) => /checkpoint|Test out/i.test(b.textContent))?.click()`);
  await waitFor(`location.pathname.startsWith("/checkpoints/")`, 40);
  const attempt = await ev("location.pathname");
  // This computer's clock six hours fast, from the next page load on
  const { result: skew } = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: "(() => { const real = Date.now.bind(Date); Date.now = () => real() + 6 * 3600_000; })();",
  });
  await go(attempt, 5000);
  const clock = await ev(`document.querySelector("main")?.innerText.includes("Time\\u2019s up: marking your checkpoint")`);
  requests.length = 0;
  await sleep(16000);
  const refreshes = requests.filter((u) => u.includes(attempt)).length;
  const expired = db("expire-checkpoints", EMAIL);
  const expiredAt = Date.now();
  requests.length = 0;
  const closed = await waitFor(`!document.querySelector("main")?.innerText.includes("marking your checkpoint") && /Try a fresh set|fresh set of drills|try a fresh set|Back to the module/.test(document.querySelector("main")?.innerText ?? "")`, 60);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: skew.identifier });
  step("clock ahead of the server", {
    clock,
    refreshesIn16s: refreshes,
    expired,
    closedOnceServerAgreed: closed,
    refreshesAfterExpiry: requests.filter((u) => u.includes(attempt)).length,
    closedAfterMs: Date.now() - expiredAt,
    mainAfter: await ev(`document.querySelector("main h1")?.closest("div")?.innerText.split("\n").filter(Boolean).slice(0, 3).join(" | ")`),
  });
}

/** Checkpoint drills lock the clipboard (2026-10-12): real pastes, drops and copies, then a practice drill as the control */
async function clipboardLock() {
  const SENTINEL = "print('PASTED FROM OUTSIDE')";
  const granted = await send("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: BASE });
  const setClipboard = (text) => ev(`navigator.clipboard.writeText(${JSON.stringify(text)}).then(() => true, (e) => String(e))`);
  const readClipboard = () => ev(`navigator.clipboard.readText().then((t) => t, (e) => "ERR " + e)`);
  const EDITOR = `window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly))`;
  const key = async (keyName, code, vk, commands, modifiers = 2) => {
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", modifiers, key: keyName, code, windowsVirtualKeyCode: vk, commands });
    await send("Input.dispatchKeyEvent", { type: "keyUp", modifiers, key: keyName, code, windowsVirtualKeyCode: vk });
  };
  const pasteKeys = () => key("v", "KeyV", 86, ["paste"]);
  const copyKeys = () => key("c", "KeyC", 67, ["copy"]);
  const notes = () => ev(`[...document.querySelectorAll("p[role=status]")].map((p) => p.innerText.trim()).filter((t) => t.includes("Copy and paste are off")).length`);

  // A checkpoint, and one of its code drills
  const moduleId = db("module-id", "1");
  await go(`/modules/${moduleId}`, 6000);
  await ev(`[...document.querySelectorAll("button")].find((b) => /checkpoint|Test out/i.test(b.textContent))?.click()`);
  await waitFor(`location.pathname.startsWith("/checkpoints/")`, 40);
  await sleep(2500);
  const drills = await ev(`[...new Set([...document.querySelectorAll("main a[href^='/exercises/']")].map((a) => a.getAttribute("href")))]`);
  let codeDrill = null;
  let predictDrill = null;
  for (const href of drills ?? []) {
    await go(href, 6000);
    const predict = await ev(`document.body.innerText.includes("What does it print?")`);
    if (predict && !predictDrill) predictDrill = href;
    if (!predict && !codeDrill) codeDrill = href;
    if (codeDrill && predictDrill) break;
  }
  step("checkpoint drills found", { granted: granted.error?.message ?? "ok", drills: drills?.length, codeDrill, predictDrill });

  // 1. The code editor: Ctrl+V, Monaco's own Paste command, a real drag and drop, then typing still works
  await go(codeDrill, 7000);
  await waitFor(`!!${EDITOR}`, 40);
  const banner = await ev(`document.body.innerText.includes("no copy and paste")`);
  const before = await ev(`${EDITOR}.getValue()`);
  const clipboardSet = await setClipboard(SENTINEL);
  await ev(`${EDITOR}.focus()`);
  await pasteKeys();
  await sleep(500);
  const afterKeys = await ev(`${EDITOR}.getValue()`);
  await ev(`${EDITOR}.focus(); ${EDITOR}.getAction("editor.action.clipboardPasteAction").run()`);
  await sleep(1200);
  const afterCommand = await ev(`${EDITOR}.getValue()`);
  const box = await ev(`(() => { const r = document.querySelector(".monaco-editor .view-lines").getBoundingClientRect(); return { x: r.x + 40, y: r.y + 20 }; })()`);
  const drag = { items: [{ mimeType: "text/plain", data: SENTINEL }], dragOperationsMask: 1 };
  for (const type of ["dragEnter", "dragOver", "drop"]) await send("Input.dispatchDragEvent", { type, x: box.x, y: box.y, data: drag });
  await sleep(500);
  const afterDrop = await ev(`${EDITOR}.getValue()`);
  await ev(`${EDITOR}.focus()`);
  await send("Input.insertText", { text: "typed_by_hand = 1" });
  await sleep(300);
  const typed = await ev(`${EDITOR}.getValue().includes("typed_by_hand = 1")`);
  // Copy out of the editor: select everything, Ctrl+C; the clipboard should still hold the sentinel
  await ev(`(() => { const e = ${EDITOR}; e.focus(); e.setSelection(e.getModel().getFullModelRange()); })()`);
  await copyKeys();
  await sleep(400);
  const clipboardAfterEditorCopy = await readClipboard();
  const codeNote = await notes();
  await shot("clipboard-code.png");
  step("checkpoint code editor", {
    banner,
    clipboardSet,
    pastedByKeys: afterKeys !== before,
    pastedByMonacoCommand: afterCommand.includes("PASTED"),
    pastedByDrop: afterDrop.includes("PASTED"),
    typingWorks: typed,
    copiedOut: clipboardAfterEditorCopy !== SENTINEL,
    noteShown: codeNote,
  });

  // 2. The task: not selectable, no Copy buttons, and a copy of it is stopped
  const userSelect = await ev(`getComputedStyle(document.querySelector("main h1").closest(".flex.flex-col.gap-6")).userSelect`);
  const copyButtons = await ev(`document.querySelectorAll("main button[aria-label='Copy code']").length`);
  await ev(`(() => { const p = document.querySelector("main h1").closest(".flex.flex-col.gap-6"); const s = getSelection(); s.removeAllRanges(); const r = document.createRange(); r.selectNodeContents(p); s.addRange(r); })()`);
  await copyKeys();
  await sleep(400);
  step("checkpoint task", { userSelect, copyButtons, copiedOut: (await readClipboard()) !== SENTINEL, notesShown: await notes() });

  // 3. A predict drill's answer box, if the draw has one
  if (predictDrill) {
    await go(predictDrill, 6000);
    const BOX = `document.querySelector("textarea[placeholder^='Type the output']")`;
    await setClipboard(SENTINEL);
    await ev(`${BOX}.focus()`);
    await pasteKeys();
    await sleep(400);
    step("checkpoint predict box", { pasted: await ev(`${BOX}.value.includes("PASTED")`), noteShown: await notes() });
  } else step("checkpoint predict box", { skipped: "this draw had no predict drill" });

  // 4. Control: a practice drill still pastes and copies normally
  const practice = db("drill-id", "hello-pylearn");
  await go(`/exercises/${practice}`, 7000);
  await waitFor(`!!${EDITOR}`, 40);
  await setClipboard(SENTINEL);
  await ev(`${EDITOR}.focus()`);
  await pasteKeys();
  await sleep(500);
  const practicePasted = await ev(`${EDITOR}.getValue().includes("PASTED")`);
  await ev(`(() => { const e = ${EDITOR}; e.focus(); e.setSelection(e.getModel().getFullModelRange()); })()`);
  await setClipboard("nothing yet");
  await copyKeys();
  await sleep(400);
  step("practice drill (control)", {
    pastes: practicePasted,
    copies: (await readClipboard()).includes("PASTED"),
    banner: await ev(`document.body.innerText.includes("no copy and paste")`),
    copyButtonsInPrompt: await ev(`document.querySelectorAll("main button[aria-label='Copy code']").length`),
  });
}

/** The examiner grades with AI (2026-10-12): the review runs, then ticks the checklist and drafts feedback; nothing is approved */
async function examinerAi() {
  const EXAMINER = `examiner-${Date.now()}@example.invalid`;
  const LEARNER = `graded-${Date.now()}@example.invalid`;
  try {
    db("existing", LEARNER);
    const submissionId = db("capstone-submission", LEARNER);
    db("examiner", EXAMINER);
    await send("Network.clearBrowserCookies");
    await go("/auth/signin", 5000);
    await fill("#email", EXAMINER);
    await fill("#password", PASSWORD);
    await clickText("button[type=submit]", "Sign in");
    await waitFor(`location.pathname === "/dashboard"`, 60);
    await go(`/admin/projects/${submissionId}/evaluate`, 7000);
    const SECTION = `document.querySelector("section[aria-labelledby=examiner-ai-heading]")`;
    const before = await ev(`${SECTION}?.innerText.split("\\n").filter(Boolean).slice(0, 3).join(" | ") ?? "no section"`);
    const criteria = await ev(`document.querySelectorAll("section[aria-labelledby=criteria-heading] li").length`);
    const titles = await ev(`[...document.querySelectorAll("section[aria-labelledby=criteria-heading] li")].map((li) => li.innerText.trim())`);

    // The review: held to watch its lines, then answered with a crafted review (no provider is called)
    await intercept("*/ai-review*");
    await clickText("button", "Review with AI");
    const pending = await watch(`${SECTION}?.innerText`, 3000, 150);
    await shot("examiner-reviewing.png");
    const review = {
      summary: "A first step: the script runs, but the brief isn't built yet.",
      verdict: "needs-work",
      model: "claude-opus-5-5",
      files: 1,
      criteria: titles.map((criterion, i) => ({ criterion, met: i === 0 ? "yes" : "no", evidence: "main.py only prints a greeting." })),
      security: [],
      nextSteps: ["Build the command-line interface the brief asks for"],
    };
    await fulfill({ review, reviewedAt: new Date().toISOString() });
    await stopIntercepting();
    await sleep(800);
    const shown = await ev(`${SECTION}?.innerText.includes("Some criteria don't look met")`);

    // It fills things in; the examiner decides
    await clickText("button", "Tick the checklist from it");
    await sleep(300);
    const metCount = await ev(`document.querySelector("section[aria-labelledby=criteria-heading]")?.innerText.match(/(\\d+) of (\\d+) met/)?.[0]`);
    const tickNote = await ev(`${SECTION}?.querySelector("[role=status]")?.innerText`);
    await clickText("button", "Draft feedback from it");
    await sleep(300);
    const feedback = await ev(`document.querySelector("textarea[aria-label='Feedback for the learner']")?.value`);
    await shot("examiner-applied.png");
    const status = db("submission-status", submissionId);
    step("examiner grades with AI", {
      before,
      criteria,
      pending: pending.filter((l) => /…|Reviewing/.test(l)),
      shown,
      metCount,
      tickNote,
      feedbackDrafted: feedback?.startsWith(review.summary) && feedback.includes("Next steps:"),
      stillPending: status,
      axe: await axe(),
    });
  } finally {
    report.push({ step: "examiner cleanup", result: db("cleanup", EXAMINER, LEARNER) });
  }
}

/** Phase 1 of the 2026-10-12 critique: progress that tells the truth, and the accessibility commitments */
async function hardenChecks() {
  const lessonSlug = "running-python";
  const lessonId = db("lesson-id", lessonSlug);
  const lastDrill = db("pass-all-but-last", EMAIL, lessonSlug);

  // The lesson page before the last drill: progress toward completing it, no locked button
  await go(`/lessons/${lessonId}`, 6000);
  await waitFor(`!document.querySelector("main [role=status][aria-busy=true]") && !!document.querySelector("main h1")`, 40);
  await shot("harden-lesson-before.png");
  const lessonBefore = await ev(`(() => { const t = document.querySelector("main")?.innerText ?? ""; return { progress: (t.match(/\\d+ of \\d+ required drills? passed/) ?? [""])[0], line: (t.match(/Pass the last required drill[^\\n]*|Pass (its|the remaining) [^\\n]*/) ?? [""])[0], lockedButton: /Finish earlier lessons first|Mark lesson complete/.test(t) }; })()`);
  const quizLive = await ev(`!!document.querySelector("section [aria-live=polite]")`);
  const navCurrent = await ev(`[...document.querySelectorAll("header nav a[aria-current=page]")].map((a) => a.textContent.trim())`);
  step("lesson before its last drill", { lessonBefore, quizLive, navCurrent });

  // Pass the last drill: the strip says the lesson is finished and leads to the next one
  await go(`/exercises/${lastDrill}`, 7000);
  await waitFor(`!!window.monaco?.editor?.getEditors?.().length`, 60);
  await sleep(1000);
  await shot("harden-drill-loaded.png");
  const editorLabel = await ev(`document.querySelector("[aria-label^='Your code for'], [aria-label^='The code for']")?.getAttribute("aria-label") ?? "none"`);
  const legend = await ev(`[...document.querySelectorAll("p")].find((p) => p.innerText.includes("leaves the editor"))?.innerText ?? "none (read-only code)"`);
  await setSolution(lastDrill);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  const finished = await waitFor(`/Lesson finished|Drill passed/.test(${BANNER})`, 120);
  const savingFrom = Date.now();
  await waitFor(`/Lesson finished/.test(${BANNER}) || (!/Saving|Adding|Still saving/.test(${BANNER}) && /Drill passed/.test(${BANNER}))`, 180);
  const saveMs = Date.now() - savingFrom;
  await sleep(1500);
  const strip = await ev(`${BANNER}`);
  const nextLink = await ev(`[...document.querySelectorAll("div")].find((d) => d.className.includes("bg-accent/55"))?.querySelector("a")?.innerText.trim()`);
  await shot("harden-lesson-finished.png");
  const celebrated = await dismissCelebrations(6);
  step("passing the last drill finishes the lesson", { editorLabel, legend, finished, saveMs, strip: strip?.split("\\n").slice(0, 3).join(" | "), nextLink, celebrated: celebrated.filter((c) => c.startsWith("clicked")).length });

  // The lesson page now says Finished; the dashboard counts it, and the first day's streak
  await go(`/lessons/${lessonId}`, 6000);
  const lessonAfter = await ev(`(document.querySelector("main header")?.innerText ?? "").includes("Finished")`);
  await go("/dashboard", 6000);
  const dash = await ev(`(() => { const t = document.querySelector("main")?.innerText ?? ""; return { streak: (t.match(/(\\d+)\\s*days? in a row/) ?? [""])[0], lessons: (t.match(/Lessons finished\\s*(\\d+)/) ?? [""])[0] }; })()`);
  const navDash = await ev(`[...document.querySelectorAll("header nav a[aria-current=page]")].map((a) => a.textContent.trim())`);
  // The first Tab lands on the skip link
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await sleep(300);
  const firstTab = await ev(`document.activeElement?.textContent?.trim()`);
  step("lesson and dashboard after", { lessonAfter, dash, navDash, firstTab });

  // "solved earlier" when the run on screen fails a solved drill
  await go(`/exercises/${lastDrill}`, 7000);
  await waitFor(`!!${PREDICT_BOX} || !!window.monaco?.editor?.getEditors?.().length`, 60);
  if (await ev(`!!${PREDICT_BOX}`)) await typeAnswer("not the output");
  else await ev(`window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)).setValue("print('not yet')")`);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  await waitFor(`/attempts?/.test(${STATUS}) && !document.querySelector("[data-quest-target=run-tests][aria-busy=true]")`, 90);
  await sleep(2500);
  step("a failing run on a solved drill", { status: await ev(STATUS) });

  // Achievements: the full descriptions
  await go("/achievements", 6000);
  const ach = await ev(`(() => { const t = document.querySelector("main")?.innerText ?? ""; return ["Earn 1,000 XP", "Pass Errors, files and context managers", "Pass Types, Protocols and Pydantic"].map((s) => s + ": " + t.includes(s)); })()`);
  step("achievement copy", { ach });

  // Phone width: the drill renders without a hydration error
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  issues.length = 0;
  await go(`/exercises/${lastDrill}`, 7000);
  const phoneErrors = issues.filter((i) => /418|hydrat/i.test(i));
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  step("drill on a phone", { hydrationErrors: phoneErrors.length });

  // The checkpoint clock speaks at 15, 5 and 1 minute left: a fast clock puts it about 10 minutes from the end
  const moduleId = db("module-id", "1");
  await go(`/modules/${moduleId}`, 6000);
  await ev(`[...document.querySelectorAll("button")].find((b) => /checkpoint|Test out/i.test(b.textContent))?.click()`);
  await waitFor(`location.pathname.startsWith("/checkpoints/")`, 40);
  await sleep(2000);
  const attempt = await ev("location.pathname");
  const deadlineIn = await ev(`(() => { const m = (document.querySelector("main")?.innerText ?? "").match(/(\\d+):(\\d\\d):(\\d\\d) left|(\\d+):(\\d\\d) left/); if (!m) return null; return m[1] ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000 : (+m[4] * 60 + +m[5]) * 1000; })()`);
  const skewMs = deadlineIn ? deadlineIn - 10 * 60_000 : 0;
  const { result: skew } = await send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const real = Date.now.bind(Date); Date.now = () => real() + ${skewMs}; })();` });
  await go(attempt, 5000);
  const spoken = await ev(`[...document.querySelectorAll("main [role=status].sr-only, main .sr-only[role=status]")].map((s) => s.textContent.trim()).filter(Boolean)`);
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: skew.identifier });
  step("checkpoint clock", { deadlineIn, spoken });

  step("axe", { lesson: await (async () => { await go(`/lessons/${lessonId}`, 6000); return axe(); })(), dashboard: await (async () => { await go("/dashboard", 6000); return axe(); })() });
}

/** Which elements shift as the drill page loads (critique: CLS 0.20 on desktop) */
async function clsProbe() {
  const drillId = db("drill-id", "hello-pylearn");
  const { result: probe } = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__shifts = []; try { new PerformanceObserver((list) => { for (const e of list.getEntries()) { if (e.hadRecentInput) continue; window.__shifts.push({ t: Math.round(e.startTime), value: Math.round(e.value * 1000) / 1000, sources: (e.sources || []).map((s) => { const n = s.node; const d = n && n.nodeType === 1 ? n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + "." + String(n.className && n.className.baseVal === undefined ? n.className : "").split(" ").filter(Boolean).slice(0, 4).join(".") + " :: " + (n.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 50) : String(n && n.nodeName); return { node: d, from: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)], to: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)] }; }) }); } }).observe({ type: "layout-shift", buffered: true }); } catch {}`,
  });
  for (const vp of [{ width: 1440, height: 900, mobile: false }, { width: 390, height: 844, mobile: true }]) {
    await send("Emulation.setDeviceMetricsOverride", { ...vp, deviceScaleFactor: 1 });
    await go(`/exercises/${drillId}`, 9000);
    const shifts = await ev(`window.__shifts`);
    const total = (shifts ?? []).reduce((s, e) => s + e.value, 0);
    step(`layout shifts at ${vp.width}`, { total: Math.round(total * 1000) / 1000, shifts });
  }
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: probe.identifier });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
}

/** A first pass on a phone: the seal is pressed into the strip's corner, clear of the text */
async function sealOnPhone() {
  const drillId = db("drill-id", "io-parse-line-item");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await go(`/exercises/${drillId}`, 7000);
  await ev(`[...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Code")?.click()`);
  await sleep(800);
  await setSolution(drillId);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  const passed = await waitFor(`/Drill passed|Lesson finished/.test(${BANNER}) && !/Saving|Adding/.test(${BANNER})`, 180);
  await dismissCelebrations(6);
  await ev(`[...document.querySelectorAll("div")].find((d) => d.className.includes("bg-accent/55"))?.scrollIntoView({ block: "center" })`);
  await sleep(1500);
  await shot("seal-phone.png");
  const overlap = await ev(`(() => {
    const strip = [...document.querySelectorAll("div")].find((d) => d.className.includes("bg-accent/55"));
    const seal = strip?.querySelector("[role=img]");
    const text = strip?.querySelector("p");
    if (!seal || !text) return "no seal or text";
    const a = seal.getBoundingClientRect(), b = text.getBoundingClientRect();
    const hit = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    return { seal: [Math.round(a.left), Math.round(a.top), Math.round(a.width), Math.round(a.height)], title: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], overlapsTitle: hit, stripRight: Math.round(strip.getBoundingClientRect().right) };
  })()`);
  step("seal on a phone", { passed, overlap });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
}

/** Phase 3: the dashboard's one slot for what to do next */
async function dashboardChecks() {
  const SLOT = `document.querySelector("main section[aria-labelledby=next-heading], main section[aria-labelledby=quest-offer-heading]")`;
  await go("/dashboard", 7000);
  const first = await ev(`(() => ({ heading: document.querySelector("main h1")?.innerText, slot: ${SLOT}?.innerText.split("\\n").filter(Boolean).slice(0, 4).join(" | "), primaries: [...document.querySelectorAll("main a, main button")].filter((el) => getComputedStyle(el).backgroundColor === getComputedStyle(document.querySelector("[data-slot=button]:not([data-variant])") ?? document.body).backgroundColor).length, rankButton: !![...document.querySelectorAll("main section[aria-label^='Your rank'] a")].find((a) => /Start stripe|Continue/.test(a.textContent)) }))()`);
  await shot("dash-quest-offer.png");
  // Decline the quest: the band takes the slot with the next lesson
  await clickText("button", "No thanks");
  await waitFor(`!!document.querySelector("main section[aria-labelledby=next-heading]")`, 40);
  await sleep(1500);
  const band = await ev(`document.querySelector("main section[aria-labelledby=next-heading]")?.innerText.split("\\n").filter(Boolean).join(" | ")`);
  const bandLink = await ev(`document.querySelector("main section[aria-labelledby=next-heading] a")?.getAttribute("href")`);
  await shot("dash-band.png");
  step("dashboard slot", { first, band, bandLink, axe: await axe() });
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await go("/dashboard", 7000);
  const fold = await ev(`(() => { const a = document.querySelector("main section[aria-labelledby=next-heading] a"); const r = a?.getBoundingClientRect(); return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), aboveFold: r.bottom <= innerHeight } : null; })()`);
  await shot("dash-band-phone.png");
  step("dashboard on a phone", { fold });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
}

/** Phase 4: achievements with real unlocks (three modules passed: the yellow belt and module patches) */
async function achievementChecks() {
  const unlocked = db("pass-modules", EMAIL, "3");
  await go("/achievements", 7000);
  const summary = await ev(`(() => {
    const t = document.querySelector("main")?.innerText ?? "";
    return {
      count: (t.match(/(\\d+)\\s*\\/\\s*(\\d+)/) ?? [""])[0],
      closest: [...document.querySelectorAll("section[aria-labelledby=closest-heading] li")].map((li) => li.innerText.split("\\n").filter(Boolean).join(" | ")),
      sections: [...document.querySelectorAll("main section[aria-labelledby^=cat-] h2")].map((h) => h.textContent + ": " + h.closest("section").querySelector(".tabular")?.textContent),
      belts: [...document.querySelectorAll("section[aria-labelledby=cat-Belts] li")].map((li) => li.innerText.split("\\n")[0]),
    };
  })()`);
  // Open the Belts section's folded list, as a learner would
  await ev(`document.querySelector("section[aria-labelledby=cat-Belts] details summary")?.click()`);
  await sleep(600);
  await ev(`document.querySelector("section[aria-labelledby=cat-Belts]")?.scrollIntoView({ block: "start" })`);
  await sleep(400);
  await shot("ach-belts.png");
  step("achievements", { unlocked, summary, axe: await axe() });
}

/** A screenshot of one element (with a margin), wherever it sits on the page */
async function shotOf(selector, name, margin = 12) {
  const box = await ev(`(() => { const el = ${selector}; if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: Math.max(0, r.x - ${margin}), y: Math.max(0, r.y + scrollY - ${margin}), width: r.width + ${margin * 2}, height: r.height + ${margin * 2} }; })()`);
  if (!box) return false;
  await sleep(300);
  const img = await send("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(new URL(name, OUT), Buffer.from(img.result.data, "base64"));
  return true;
}

/** Start recording what a screen reader would hear: each live region's text whenever it changes */
const LISTEN = `(() => {
  window.__heard = [];
  const last = new Map();
  const scan = (record) => {
    for (const reg of document.querySelectorAll("main [aria-live]:not([aria-live=off]), main [role=status], main [role=alert]")) {
      const t = (reg.innerText || "").trim().replace(/\\s+/g, " ");
      if (record && t && last.get(reg) !== t) window.__heard.push(t.slice(0, 180));
      last.set(reg, t);
    }
  };
  scan(false);
  new MutationObserver(() => scan(true)).observe(document.querySelector("main"), { subtree: true, childList: true, characterData: true });
  return true;
})()`;

/** The 2026-10-13 deferred items, as the learner: one voice for results, Edit in the scratchpad, hand-in from a drill, the sensei, the AI default */
async function deferredLearner() {
  // What a screen reader hears on a failing run, then a passing one
  const drillId = db("drill-id", "hello-pylearn");
  await go(`/exercises/${drillId}`, 7000);
  await waitFor(`!!window.monaco?.editor?.getEditors?.().length`, 60);
  await sleep(800);
  await ev(LISTEN);
  await ev(`(() => { const ed = window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)); ed.setValue("print('not yet')"); })()`);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  await waitFor(`window.__heard.some((t) => t === "Attempt saved.")`, 120);
  const failing = await ev(`window.__heard.splice(0)`);
  await setSolution(drillId);
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  await waitFor(`window.__heard.some((t) => t.startsWith("Saved"))`, 120);
  await sleep(1500);
  const passing = await ev(`window.__heard.splice(0)`);
  await dismissCelebrations(6);
  const resultsLive = await ev(`!!document.querySelector("main [aria-live] [data-quest-target], main [aria-live] ul")`);
  step("one voice for results", { failing, passing, resultsBlockIsLive: resultsLive });

  // The lesson's code blocks: Edit, Run, Copy; Edit opens the example in the scratchpad
  const lessonId = db("lesson-id", "running-python");
  await go(`/lessons/${lessonId}`, 6000);
  const BLOCK = `[...document.querySelectorAll("main div.my-6")].find((d) => d.querySelector("[data-quest-target=run-example]"))`;
  const controls = await ev(`[...(${BLOCK})?.querySelectorAll("button") ?? []].map((b) => b.getAttribute("aria-label") || b.innerText.trim())`);
  const example = await ev(`(${BLOCK})?.querySelector("pre")?.innerText.trim()`);
  await shotOf(BLOCK, "deferred-code-block.png");
  await ev(`(${BLOCK})?.querySelector("button[aria-label^='Edit this example']")?.click()`);
  await waitFor(`!!document.querySelector("#scratchpad") && window.monaco?.editor?.getEditors?.().some((e) => document.querySelector("#scratchpad")?.contains(e.getDomNode()))`, 60);
  await sleep(800);
  const inScratchpad = await ev(`window.monaco.editor.getEditors().find((e) => document.querySelector("#scratchpad")?.contains(e.getDomNode()))?.getValue().trim()`);
  await shot("deferred-scratchpad.png");
  // Close the pane again, so later lessons open without it
  await ev(`document.querySelector("#scratchpad button[aria-label='Close scratchpad']")?.click()`);
  step("lesson code blocks", { controls, editLoadsScratchpad: inScratchpad === example, axe: await axe() });

  // The AI default for a learner without a key
  await go("/settings", 6000);
  const model = await ev(`document.querySelector("[role=radiogroup][aria-label=Model] [aria-checked=true]")?.innerText.replace(/\\s+/g, " ").trim()`);
  step("AI default model", { model });

  // The sensei on the dashboard's quest offer, light and dark
  await go("/dashboard", 6000);
  const OFFER = `document.querySelector("main svg[data-mood]")?.closest("section, div.rounded-md, div")`;
  await shotOf(`document.querySelector("main svg[data-mood]")?.parentElement?.parentElement`, "deferred-sensei-offer.png", 16);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await ev(`(() => { try { localStorage.setItem("theme", "dark"); } catch {} })()`);
  await go("/dashboard", 6000);
  await shotOf(`document.querySelector("main svg[data-mood]")?.parentElement?.parentElement`, "deferred-sensei-offer-dark.png", 16);
  await ev(`(() => { try { localStorage.setItem("theme", "light"); } catch {} })()`);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  step("sensei", { drawn: await ev(`!!${OFFER}`) });

  // Hand in from inside a checkpoint drill
  const moduleId = db("module-id", "1");
  await go(`/modules/${moduleId}`, 6000);
  await ev(`[...document.querySelectorAll("button")].find((b) => /checkpoint|Test out/i.test(b.textContent))?.click()`);
  await waitFor(`location.pathname.startsWith("/checkpoints/")`, 40);
  await sleep(2500);
  const attemptPath = await ev("location.pathname");
  const cpDrill = await ev(`document.querySelector("main a[href^='/exercises/']")?.getAttribute("href")`);
  await go(cpDrill, 7000);
  const BANNER_CP = `[...document.querySelectorAll("main div")].find((d) => d.className.includes("bg-primary/6"))`;
  const bannerBefore = await ev(`(${BANNER_CP})?.innerText.replace(/\\s+/g, " ").trim()`);
  await shotOf(BANNER_CP, "deferred-handin-banner.png");
  await ev(`[...(${BANNER_CP})?.querySelectorAll("button") ?? []].find((b) => b.textContent.trim() === "Hand in")?.click()`);
  await sleep(500);
  const confirm = await ev(`(${BANNER_CP})?.innerText.replace(/\\s+/g, " ").trim()`);
  await shotOf(BANNER_CP, "deferred-handin-confirm.png");
  const axeConfirm = await axe();
  await ev(`[...(${BANNER_CP})?.querySelectorAll("button") ?? []].find((b) => b.textContent.trim() === "Hand in")?.click()`);
  const landed = await waitFor(`location.pathname === ${JSON.stringify(attemptPath)}`, 60);
  await sleep(2500);
  const result = await ev(`document.querySelector("main")?.innerText.split("\\n").filter(Boolean).slice(0, 8).join(" | ")`);
  await shot("deferred-handin-result.png");
  step("hand in from a checkpoint drill", { bannerBefore, confirm, axeConfirm, landed, result });
}

/** As an examiner: a submitted file read on the grading screen */
async function deferredExaminer() {
  const EXAMINER = `examiner-${Date.now()}@example.invalid`;
  const LEARNER = `graded-${Date.now()}@example.invalid`;
  try {
    db("existing", LEARNER);
    const submissionId = db("capstone-submission", LEARNER);
    db("examiner", EXAMINER);
    await send("Network.clearBrowserCookies");
    await go("/auth/signin", 5000);
    await fill("#email", EXAMINER);
    await fill("#password", PASSWORD);
    await clickText("button[type=submit]", "Sign in");
    await waitFor(`location.pathname === "/dashboard"`, 60);
    await go(`/admin/projects/${submissionId}/evaluate`, 7000);
    const WORK = `document.querySelector("section[aria-labelledby=work-heading]")`;
    const before = await ev(`[...(${WORK})?.querySelectorAll("button, a") ?? []].map((b) => b.innerText.trim())`);
    await clickText("section[aria-labelledby=work-heading] button", "View");
    await sleep(400);
    const shown = await ev(`(${WORK})?.querySelector("pre")?.innerText`);
    const expanded = await ev(`(${WORK})?.querySelector("button[aria-expanded]")?.getAttribute("aria-expanded")`);
    await shotOf(WORK, "deferred-examiner-view.png");
    step("examiner reads a submitted file", { before, shown, expanded, axe: await axe() });
  } finally {
    report.push({ step: "examiner cleanup", result: db("cleanup", EXAMINER, LEARNER) });
  }
}

/** Certificates (2026-10-13): claim, the page, print, the image, the holder's controls, withdraw */
async function certificateChecks() {
  db("certificate-ready", EMAIL);

  // The dashboard leads with the claim
  await go("/dashboard", 7000);
  const band = await ev(`document.querySelector("section[aria-labelledby=next-heading]")?.innerText.replace(/\\s+/g, " ").trim()`);
  await shotOf(`document.querySelector("section[aria-labelledby=next-heading]")`, "cert-dashboard-band.png");

  // The profile: one to claim, one with what's left
  const profileFrom = Date.now();
  await go("/profile", 1000);
  const SECTION = `document.querySelector("section[aria-labelledby=certificates-heading]")`;
  await waitFor(`!!${SECTION}`, 80);
  const profileMs = Date.now() - profileFrom;
  await sleep(800);
  const rows = await ev(`[...(${SECTION})?.querySelectorAll("li") ?? []].map((li) => li.innerText.replace(/\\s+/g, " ").trim())`);
  await shotOf(SECTION, "cert-profile.png");

  // The claim dialog: the preview follows the name
  await ev(`[...(${SECTION})?.querySelectorAll("button") ?? []].find((b) => b.textContent.includes("Claim your certificate"))?.click()`);
  await waitFor(`!!document.querySelector("[role=dialog] #claim-name")`, 20);
  await sleep(500);
  await fill("#claim-name", "  Grace   Hopper ");
  await sleep(400);
  const preview = await ev(`document.querySelector("[role=dialog] article")?.innerText.includes("Grace Hopper")`);
  const focusInDialog = await ev(`!!document.activeElement?.closest("[role=dialog]")`);
  await shot("cert-claim-dialog.png");
  const axeDialog = await axe();
  await ev(`[...document.querySelectorAll("[role=dialog] button[type=submit]")].find((b) => b.textContent.includes("Issue my certificate"))?.click()`);
  await sleep(700);
  await shot("cert-claim-stamped.png");
  const landed = await waitFor(`location.pathname.startsWith("/certificates/PL-AI-")`, 40);
  await sleep(2500);
  const code = await ev(`location.pathname.split("/").pop()`);
  const page = await ev(`(() => ({
    title: document.title,
    robots: document.querySelector("meta[name=robots]")?.content,
    ogImage: document.querySelector("meta[property='og:image']")?.content,
    h1: document.querySelector("h1")?.textContent,
    sheet: document.querySelector("article[data-certificate-print]")?.innerText.replace(/\\s+/g, " ").trim(),
    line: [...document.querySelectorAll("main p")].find((p) => p.textContent.startsWith("Issued by pylearn"))?.textContent,
    controls: [...document.querySelectorAll("section[aria-labelledby=holder-heading] button, section[aria-labelledby=holder-heading] a")].map((b) => b.innerText.trim()),
  }))()`);
  await shot("cert-page-desktop.png");
  step("claim a certificate", { band, profileMs, rows, preview, focusInDialog, axeDialog, landed, code, page, axe: await axe() });

  // Print: one A4 landscape page
  const pdf = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
  const bytes = Buffer.from(pdf.result.data, "base64");
  writeFileSync(new URL("cert-print.pdf", OUT), bytes);
  const text = bytes.toString("latin1");
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const mediaBox = text.match(/\/MediaBox\s*\[([^\]]+)\]/)?.[1]?.trim();
  step("print", { pages, mediaBox });

  // The image, as a link preview fetches it (no cookies)
  const png = await fetch(`${BASE}/certificates/${code}/image`);
  const pngBytes = Buffer.from(await png.arrayBuffer());
  writeFileSync(new URL("cert-image.png", OUT), pngBytes);
  const isPng = pngBytes.length > 24 && pngBytes.toString("latin1", 1, 4) === "PNG";
  step("image", { status: png.status, type: png.headers.get("content-type"), kb: Math.round(pngBytes.length / 1024), width: isPng ? pngBytes.readUInt32BE(16) : null, height: isPng ? pngBytes.readUInt32BE(20) : null });

  // On a phone: stacked, readable, no sideways scroll
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await go(`/certificates/${code}`, 5000);
  const phone = await ev(`({ overflow: document.documentElement.scrollWidth > innerWidth, statementPx: parseFloat(getComputedStyle([...document.querySelectorAll("article p")].find((p) => p.textContent.startsWith("passed all"))).fontSize) })`);
  const { result: m } = await send("Page.getLayoutMetrics");
  await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 390, height: Math.min(m.cssContentSize.height, 3000), scale: 1 }, captureBeyondViewport: true }).then((img) =>
    writeFileSync(new URL("cert-page-phone.png", OUT), Buffer.from(img.result.data, "base64"))
  );
  step("on a phone", { ...phone, axe: await axe() });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  // Dark theme: the page follows it, the certificate stays paper
  await ev(`(() => { try { localStorage.setItem("theme", "dark"); } catch {} })()`);
  await go(`/certificates/${code}`, 5000);
  await shot("cert-page-dark.png");
  const darkSheet = await ev(`getComputedStyle(document.querySelector("article[data-certificate-print] > div")).backgroundColor`);
  await ev(`(() => { try { localStorage.setItem("theme", "light"); } catch {} })()`);

  // The holder fixes the printed name
  await go(`/certificates/${code}`, 5000);
  await fill("#certificate-name", "Grace Brewster Hopper");
  await ev(`[...document.querySelectorAll("section[aria-labelledby=holder-heading] button[type=submit]")][0]?.click()`);
  const renamed = await waitFor(`document.querySelector("article[data-certificate-print]")?.innerText.includes("Grace Brewster Hopper")`, 30);
  // Let the refresh that brought the new name settle before the next change
  await sleep(2000);

  // Withdraw: visitors get the neutral 404, the holder still sees it
  const HOLDER = `[...document.querySelectorAll("section[aria-labelledby=holder-heading] button")]`;
  await ev(`${HOLDER}.find((b) => b.textContent.trim() === "Withdraw the public page")?.click()`);
  const confirmShown = await waitFor(`document.body.innerText.includes("Withdraw it?")`, 20);
  await shotOf(`document.querySelector("section[aria-labelledby=holder-heading]")`, "cert-withdraw-confirm.png");
  // A loading button holds both its labels ("Withdraw the page" and "Withdrawing…")
  await ev(`${HOLDER}.find((b) => b.textContent.trim().startsWith("Withdraw the page"))?.click()`);
  const withdrawnShown = await waitFor(`document.body.innerText.includes("Restore the public page")`, 80);
  await sleep(1000);
  const holderSees = await ev(`document.querySelector("main > p[role=status]")?.innerText.replace(/\\s+/g, " ").trim()`);
  await shot("cert-withdrawn-holder.png");
  const visitor = await fetch(`${BASE}/certificates/${code}`);
  const visitorBody = await visitor.text();
  const visitorImage = await fetch(`${BASE}/certificates/${code}/image`);
  // Restore
  await ev(`${HOLDER}.find((b) => b.textContent.includes("Restore the public page"))?.click()`);
  const restoredShown = await waitFor(`document.body.innerText.includes("Withdraw the public page")`, 80);
  const restored = await fetch(`${BASE}/certificates/${code}`);
  step("holder controls", {
    darkSheet,
    renamed,
    confirmShown,
    withdrawnShown,
    restoredShown,
    holderSees,
    visitorStatus: visitor.status,
    visitorSaysNoCertificate: visitorBody.includes("No certificate here"),
    visitorSeesName: visitorBody.includes("Grace Brewster Hopper"),
    visitorImageStatus: visitorImage.status,
    restoredStatus: restored.status,
    unknownStatus: (await fetch(`${BASE}/certificates/PL-PY-0000-0000`)).status,
  });

  // The Python certificate's design (issued directly; the black belt itself isn't set up here)
  const pyCode = db("certificate-issue", EMAIL, "python", "Ada", "King", "Lovelace");
  await go(`/certificates/${pyCode}`, 5000);
  await shot("cert-python-desktop.png");
  const py = await fetch(`${BASE}/certificates/${pyCode}/image`);
  writeFileSync(new URL("cert-python-image.png", OUT), Buffer.from(await py.arrayBuffer()));
  step("python certificate", { status: py.status, axe: await axe() });
}

try {
  await signIn();
  if (process.env.ONLY === "probe") {
    const drillId = db("drill-id", "hello-pylearn");
    await send("Page.navigate", { url: `${BASE}/exercises/${drillId}` });
    for (const wait of [1000, 3000, 6000]) {
      await sleep(wait);
      step(`probe +${wait}`, {
        at: await ev("location.pathname"),
        mainLength: await ev(`document.querySelector("main")?.innerText.length`),
        mainOpacity: await ev(`[...document.querySelectorAll("main *")].slice(0, 3).map((e) => getComputedStyle(e).opacity).join(",")`),
        button: await ev(BUTTON),
        mainHtml: await ev(`document.querySelector("main")?.innerHTML.slice(0, 400)`),
      });
    }
    await shot("probe.png");
    await send("Page.navigate", { url: `${BASE}/modules` });
    await sleep(5000);
    step("probe modules", { at: await ev("location.pathname"), mainLength: await ev(`document.querySelector("main")?.innerText.length`) });
    await send("Page.navigate", { url: `${BASE}/dashboard` });
    await sleep(6000);
    step("probe dashboard", { at: await ev("location.pathname"), mainLength: await ev(`document.querySelector("main")?.innerText.length`), mainHtml: await ev(`document.querySelector("main")?.innerHTML.slice(0, 300)`) });
    throw "done";
  }
  // ONLY=phase1,phase2,phase3,phase4,signedout (any of them); everything by default
  const want = (p) => !process.env.ONLY || process.env.ONLY.split(",").includes(p);
  if (want("phase1")) await phase1();
  if (want("phase2")) await phase2();
  // Phase 3 signs in again itself, through the form it checks
  if (want("phase3")) await phase3();
  if (want("phase4")) await phase4();
  if (want("signedout")) await signedOut();
  if (process.env.ONLY?.split(",").includes("fixes")) await fixes();
  if (process.env.ONLY?.split(",").includes("clipboard")) await clipboardLock();
  if (process.env.ONLY?.split(",").includes("examiner")) await examinerAi();
  if (process.env.ONLY?.split(",").includes("harden")) await hardenChecks();
  if (process.env.ONLY?.split(",").includes("cls")) await clsProbe();
  if (process.env.ONLY?.split(",").includes("seal")) await sealOnPhone();
  if (process.env.ONLY?.split(",").includes("dash")) await dashboardChecks();
  if (process.env.ONLY?.split(",").includes("ach")) await achievementChecks();
  if (process.env.ONLY?.split(",").includes("certificates")) await certificateChecks();
  if (process.env.ONLY?.split(",").includes("deferred")) {
    await deferredLearner();
    // Its timing of the save that finishes a lesson (18 s before 2026-10-13's single achievement check)
    await hardenChecks();
    await deferredExaminer();
  }
} catch (e) {
  if (e !== "done") report.push({ step: "crashed", error: String(e && e.stack || e) });
} finally {
  report.push({ step: "cleanup", result: db("cleanup", EMAIL) });
  for (const r of report) console.log(JSON.stringify(r));
  ws.close();
  chrome.kill();
  process.exit(0);
}
