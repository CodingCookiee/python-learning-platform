// Dev-only: the first-session quest end to end with throwaway accounts (deleted at the end).
//   BASE=http://localhost:3010 node .impeccable/quest-e2e.mjs
// A beginner and a developer each do all five steps for real, through the farewell (the developer
// skips and resumes on the way; the beginner finishes in dark mode); an existing learner gets the
// dashboard offer with their history ticked; then phone width. axe at each stop.
import { spawn, execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/quest/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";
const PORT = 9338;
const stamp = Date.now();
const BEGINNER = `quest-beginner-${stamp}@example.invalid`;
const DEVELOPER = `quest-dev-${stamp}@example.invalid`;
const EXISTING = `quest-existing-${stamp}@example.invalid`;
const PASSWORD = "E2e-Quest-2026";

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-quest", "about:blank"]);
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
  else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") issues.push("LOG " + m.params.entry.text.slice(0, 300));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
const desktop = () => send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const phone = () => send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
const theme = (value) => send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value }] });
await desktop();
await theme("light");
await send("Network.clearBrowserCookies");

const go = async (path, wait = 5000) => { await send("Page.navigate", { url: BASE + path }); await sleep(wait); };
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };
const at = () => ev("location.pathname");
const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const clickText = (selector, text) => ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.includes(${JSON.stringify(text)})); el?.click(); return !!el; })()`);
const shot = async (name) => {
  const res = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL(name, OUT), Buffer.from(res.result.data, "base64"));
};
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const axe = async () => {
  await ev(axeSource);
  return ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then(r => r.violations.map(v => v.id + " (" + v.nodes.length + "): " + v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(", ")))`);
};
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const report = [];
const step = async (name, data = {}) => { report.push({ step: name, ...data, errors: [...new Set(issues.splice(0))] }); };

// The quest panel, as the learner sees it
const POS = `(() => { const t = document.querySelector("[data-quest-panel]")?.innerText ?? ""; const m = t.match(/(?:step|Quest) (\\d) of 5/); return m ? Number(m[1]) : 0; })()`;
const pos = () => ev(POS);
const panelText = () => ev(`document.querySelector("[data-quest-panel]")?.innerText ?? ""`);
const expand = async () => { if (await ev(`!!document.querySelector("button[data-quest-panel]")`)) { await ev(`document.querySelector("button[data-quest-panel]").click()`); await sleep(400); } };
const pointer = () => ev(`(() => { const r = document.querySelector("[class*=animate-quest-pulse]"); if (!r) return null; const b = r.getBoundingClientRect(); return { label: r.nextElementSibling?.textContent, top: Math.round(b.top), left: Math.round(b.left) }; })()`);
const goThere = async () => {
  await expand();
  const href = await ev(`[...document.querySelectorAll("section[data-quest-panel] a")].find((a) => a.textContent.includes("Go there"))?.getAttribute("href")`);
  if (!href) return null;
  await clickText("section[data-quest-panel] a", "Go there");
  await waitFor(`location.pathname === ${JSON.stringify(href)}`, 40);
  await sleep(2500);
  return href;
};
const reachStep = (n, tries = 120) => waitFor(`${POS} === ${n}`, tries);
async function passDrill(label) {
  const drillId = (await at()).split("/").pop();
  const drill = JSON.parse(db("drill", drillId));
  await waitFor(`!!window.monaco?.editor?.getEditors?.().length`, 60);
  const set = await ev(`(() => { const ed = window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)); if (!ed) return false; ed.setValue(${JSON.stringify(drill.solution)}); return true; })()`);
  await waitFor(`!document.querySelector("[data-quest-target=run-tests]")?.textContent.includes("Loading")`, 120);
  const ptr = await pointer();
  await ev(`document.querySelector("[data-quest-target=run-tests]").click()`);
  const passed = await waitFor(`/\\b(\\d+) of \\1 tests passed/.test(document.body.innerText)`, 120);
  await sleep(1500);
  await shot(`${label}.png`);
  return { drill: drill.slug, codeSet: set, pointer: ptr, passed };
}

/** A new learner: a fresh account (made in the database: sign-up is rate limited), sign in, onboarding */
async function newLearner(email, name, experience) {
  await send("Network.clearBrowserCookies");
  db("fresh", email, JSON.stringify(name));
  await go("/auth/signin", 5000);
  // A new learner on this device: no remembered panel state
  await ev(`localStorage.removeItem("pylearn:quest-panel")`);
  await fill("#email", email);
  await fill("#password", PASSWORD);
  await clickText("button[type=submit]", "Sign in");
  await waitFor(`location.pathname === "/onboarding"`, 60);
  await sleep(1500);
  await clickText("[role=radio]", experience);
  await clickText("[role=radio]", "Advanced Python");
  await clickText("button", "Start training");
  await waitFor(`location.pathname !== "/onboarding"`, 60);
  await sleep(4000);
}

/** All five steps for real. `skipResume`: skip after step 1, resume from the dashboard. `darkFrom`: switch to dark at step 5. */
async function fullQuest(label, { skipResume = false, dark = false } = {}) {
  await step(`${label}: after onboarding`, {
    landedOn: await at(),
    position: await pos(),
    card: await ev(`!!document.querySelector("section[data-quest-panel]")`),
    welcome: (await panelText()).includes("Welcome to the mat"),
    axe: await axe(),
  });
  await shot(`${label}-1-start.png`);

  // 1. Run code
  const lesson = await goThere();
  await waitFor(`[...document.querySelectorAll("section[data-quest-panel] button")].some((b) => b.textContent.includes("Show me"))`, 30);
  await clickText("section[data-quest-panel] button", "Show me");
  await sleep(2000);
  const ptr1 = await pointer();
  const focused = await ev(`document.activeElement?.getAttribute("data-quest-target")`);
  await shot(`${label}-2-pointer-run.png`);
  const pointerAxe = await axe();
  await ev(`document.querySelector("[data-quest-target=run-example]").click()`);
  const step1 = await reachStep(2);
  await step(`${label}: 1 run code`, {
    lesson,
    pointer: ptr1,
    showMeFocused: focused,
    done: step1,
    announced: await ev(`document.querySelector("p.sr-only[aria-live=polite]")?.textContent`),
    axe: pointerAxe,
  });

  if (skipResume) {
    await expand();
    await clickText("section[data-quest-panel] button", "Skip the quest");
    await sleep(600);
    const confirm = await ev(`document.querySelector("[role=alertdialog]")?.innerText`);
    await clickText("[role=alertdialog] button", "Skip the quest");
    const gone = await waitFor(`!document.querySelector("[data-quest-panel]")`, 20);
    await go("/dashboard", 6000);
    const card = await ev(`document.querySelector("#quest-offer-heading")?.closest("section")?.innerText`);
    await shot(`${label}-3-resume-card.png`);
    const cardAxe = await axe();
    await clickText("#quest-offer-heading ~ * button, section button", "Resume");
    const back = await reachStep(2, 30);
    const cardGone = await waitFor(`!document.querySelector("#quest-offer-heading")`, 6);
    await step(`${label}: skip and resume`, { confirm, panelGone: gone, card, resumed: back, cardGone, axe: cardAxe });
    await goThere();
  }

  // 2. Scratchpad: the pointer is on the toggle, the panel folds while the pane is open
  await sleep(1000);
  const ptr2 = await pointer();
  await ev(`document.querySelector("button[data-quest-target=scratchpad]:not(#scratchpad *)").click()`);
  await waitFor(`!!document.querySelector("#scratchpad")`, 20);
  await sleep(1500);
  const folded = await ev(`!!document.querySelector("button[data-quest-panel]")`);
  const ptrPane = await pointer();
  await shot(`${label}-4-scratchpad.png`);
  await ev(`document.querySelector("#scratchpad [data-quest-target=scratchpad]").click()`);
  const step2 = await reachStep(3);
  await ev(`document.querySelector("[aria-label='Close scratchpad']")?.click()`);
  await sleep(800);
  await step(`${label}: 2 scratchpad`, { pointerOnToggle: ptr2, foldedWhileOpen: folded, pointerInPane: ptrPane, done: step2 });

  // 3. First drill, 4. the bug drill: the real code, Run tests
  const drillHref = await goThere();
  const d3 = await passDrill(`${label}-5-first-drill`);
  const step3 = await reachStep(4);
  // The pass banner animates in; axe the settled page
  await sleep(4000);
  await step(`${label}: 3 first drill`, { href: drillHref, ...d3, done: step3, axe: await axe() });
  const contrast = await ev(`axe.run(document, { runOnly: ["color-contrast"] }).then((r) => r.violations.flatMap((v) => v.nodes.map((n) => n.html.slice(0, 160) + " => " + (n.any[0]?.message ?? ""))))`);
  report.push({ step: `${label}: drill contrast detail`, contrast });
  const bugHref = await goThere();
  const d4 = await passDrill(`${label}-6-bug-drill`);
  const step4 = await reachStep(5);
  await step(`${label}: 4 fix a bug`, { href: bugHref, ...d4, done: step4 });

  // 5. The dashboard tour, then the farewell
  if (dark) await theme("dark");
  await goThere();
  await expand();
  const tour = [];
  for (const next of ["Next", "Next", "Got it"]) {
    await sleep(800);
    await clickText("section[data-quest-panel] button", "Show me");
    await sleep(1200);
    tour.push({ text: await ev(`[...document.querySelectorAll("section[data-quest-panel] p")].slice(1, 3).map((p) => p.textContent).join(" | ")`), pointer: await pointer() });
    if (tour.length === 1) {
      await sleep(2500);
      await shot(`${label}-7-tour.png`);
      tour[0].axe = await axe();
    }
    await clickText("section[data-quest-panel] button", next);
  }
  const farewell = await waitFor(`!!document.querySelector("[role=dialog]") && document.querySelector("[role=dialog]").innerText.includes("Ready to Train")`, 30);
  await sleep(1500);
  await shot(`${label}-8-farewell.png`);
  const dialog = await ev(`document.querySelector("[role=dialog]")?.innerText`);
  const finishHref = await ev(`[...document.querySelectorAll("[role=dialog] a")].find((a) => a.textContent.includes("Finish lesson 1"))?.getAttribute("href")`);
  const farewellAxe = await axe();
  const toasts = await ev(`[...document.querySelectorAll("[role=dialog]")].length`);
  await clickText("[role=dialog] a", "Finish lesson 1");
  await waitFor(`location.pathname === ${JSON.stringify(lesson)}`, 30);
  await sleep(2500);
  await step(`${label}: 5 progress and farewell`, {
    tour,
    farewell,
    dialog,
    dialogs: toasts,
    finishGoesToLesson1: finishHref === lesson,
    landedOn: await at(),
    panelGone: !(await ev(`!!document.querySelector("[data-quest-panel]")`)),
    stored: db("quest", label === "beginner" ? BEGINNER : DEVELOPER),
    axe: farewellAxe,
  });
  if (dark) await theme("light");
}

try {
  // ONLY=contrast: pass one drill and check the pass state's contrast in light and dark, nothing else
  if (process.env.ONLY === "contrast") {
    await newLearner(BEGINNER, "Quest Beginner", "New to programming");
    await go(`/exercises/${db("drill-id", "start-say-hello")}`, 6000);
    const d = await passDrill("contrast-light");
    await sleep(4000);
    const light = await axe();
    await theme("dark");
    await sleep(1500);
    await shot("contrast-dark.png");
    await step("contrast", { passed: d.passed, light, dark: await axe() });
    await theme("light");
    throw "done";
  }
  // ONLY=existing skips the two full quests (the existing learner and phone width only)
  if (process.env.ONLY !== "existing") {
    // A beginner, finishing in dark mode
    await newLearner(BEGINNER, "Quest Beginner", "New to programming");
    await fullQuest("beginner", { dark: true });

    // A developer, skipping and resuming
    await newLearner(DEVELOPER, "Quest Developer", "I already write Python");
    await fullQuest("developer", { skipResume: true });
  }

  // An existing learner from before the quest: the offer, history ticked
  await send("Network.clearBrowserCookies");
  db("existing", EXISTING);
  await go("/auth/signin", 5000);
  await fill("#email", EXISTING);
  await fill("#password", PASSWORD);
  await clickText("button[type=submit]", "Sign in");
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await sleep(4000);
  const offer = await ev(`document.querySelector("#quest-offer-heading")?.closest("section")?.innerText`);
  const noPanelYet = !(await ev(`!!document.querySelector("[data-quest-panel]")`));
  await shot("existing-1-offer.png");
  const offerAxe = await axe();
  await theme("dark");
  await sleep(1000);
  const offerAxeDark = await axe();
  await shot("existing-1-offer-dark.png");
  await theme("light");
  await clickText("section button", "Start the quest");
  await reachStep(1, 30);
  await sleep(1500);
  await expand();
  await step("existing: offer and start", {
    offer,
    noPanelYet,
    position: await pos(),
    ticked: await ev(`[...document.querySelectorAll("section[data-quest-panel] li")].filter((li) => li.innerText.includes("(done)") || li.querySelector(".sr-only")?.textContent === "(done)").map((li) => li.innerText.split("\\n").pop())`),
    offerGone: await waitFor(`!document.querySelector("#quest-offer-heading")`, 20),
    axe: offerAxe,
    axeDark: offerAxeDark,
  });

  // Phone width: the pill first, the sheet when opened, out of the scratchpad's way
  const lessonHref = await ev(`[...document.querySelectorAll("section[data-quest-panel] a")].find((a) => a.textContent.includes("Go there"))?.getAttribute("href")`);
  await phone();
  await ev(`localStorage.removeItem("pylearn:quest-panel")`);
  await go(lessonHref, 6000);
  const pill = await ev(`(() => { const b = document.querySelector("button[data-quest-panel]")?.getBoundingClientRect(); return b && { top: Math.round(b.top), bottom: Math.round(b.bottom), right: Math.round(b.right), width: Math.round(b.width) }; })()`);
  await shot("phone-1-pill.png");
  await expand();
  const sheet = await ev(`(() => { const b = document.querySelector("section[data-quest-panel]")?.getBoundingClientRect(); return b && { left: Math.round(b.left), width: Math.round(b.width), bottom: Math.round(b.bottom), height: Math.round(b.height) }; })()`);
  await shot("phone-2-sheet.png");
  const sheetAxe = await axe();
  await ev(`document.querySelector("[aria-label='Minimise the quest']")?.click()`);
  await sleep(400);
  await ev(`document.querySelector("button[data-quest-target=scratchpad]:not(#scratchpad *)")?.click()`);
  await waitFor(`!!document.querySelector("#scratchpad")`, 20);
  await sleep(1500);
  const clear = await ev(`(() => { const p = document.querySelector("[data-quest-panel]")?.getBoundingClientRect(); const s = document.querySelector("#scratchpad")?.getBoundingClientRect(); return p && s ? { panelBottom: Math.round(p.bottom), paneTop: Math.round(s.top), overlaps: p.bottom > s.top } : null; })()`);
  await shot("phone-3-scratchpad.png");
  await step("phone", { pill, sheet, withScratchpad: clear, axe: sheetAxe });
  await desktop();
} catch (e) {
  if (e !== "done") report.push({ step: "crashed", error: String(e && e.stack || e) });
} finally {
  report.push({ step: "cleanup", result: db("cleanup", BEGINNER, DEVELOPER, EXISTING) });
  for (const r of report) console.log(JSON.stringify(r));
  ws.close();
  chrome.kill();
  process.exit(0);
}
