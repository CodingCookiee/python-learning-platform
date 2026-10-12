// Dev-only: technical audit evidence for every main surface (impeccable audit): axe (WCAG 2.2 AA), overflow at
// phone width, touch targets, headings and landmarks, reduced motion, and what each page loads.
//   BASE=http://localhost:3010 node .impeccable/app-audit.mjs
// Throwaway accounts only, deleted at the end. Writes .impeccable/review/audit/audit.json
import { execSync, spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = new URL("./review/audit/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const PORT = 9344;
const stamp = Date.now();
const LEARNER = `audit-${stamp}@example.invalid`;
const EXAMINER = `audit-examiner-${stamp}@example.invalid`;
const PASSWORD = "E2e-Quest-2026";

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-audit", "about:blank"]);
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
const errors = [];
const responses = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  else if (m.method === "Runtime.exceptionThrown") errors.push("EXC " + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300));
  else if (m.method === "Network.responseReceived") responses.set(m.params.requestId, { url: m.params.response.url, type: m.params.type });
  else if (m.method === "Network.loadingFinished") {
    const r = responses.get(m.params.requestId);
    if (r) r.bytes = m.params.encodedDataLength;
  }
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };
const axeSource = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setFocusEmulationEnabled", { enabled: true });

const VIEWPORTS = { desktop: { width: 1440, height: 900, mobile: false }, mobile: { width: 390, height: 844, mobile: true } };
const results = [];

/** Everything measurable about one page in one viewport and theme */
async function audit(key, path, vp = "desktop", theme = "light") {
  const v = VIEWPORTS[vp];
  await send("Emulation.setDeviceMetricsOverride", { width: v.width, height: v.height, deviceScaleFactor: 1, mobile: v.mobile });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  await ev(`(() => { try { localStorage.setItem("theme", ${JSON.stringify(theme)}); } catch {} })()`);
  responses.clear();
  errors.length = 0;
  await send("Page.navigate", { url: BASE + path });
  await sleep(7000);
  const timing = await ev(`(() => { const n = performance.getEntriesByType("navigation")[0]; const p = performance.getEntriesByType("paint"); return n ? { ttfb: Math.round(n.responseStart), domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(p.find((x) => x.name === "first-contentful-paint")?.startTime ?? 0) } : null; })()`);
  const lcp = await ev(`new Promise((res) => { let v = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {} setTimeout(() => res(Math.round(v)), 300); })`);
  const cls = await ev(`new Promise((res) => { let v = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {} setTimeout(() => res(Math.round(v * 1000) / 1000), 300); })`);
  const net = [...responses.values()];
  const js = net.filter((r) => r.type === "Script");
  const css = net.filter((r) => r.type === "Stylesheet");
  const fonts = net.filter((r) => r.type === "Font");
  const imgs = net.filter((r) => r.type === "Image");
  const sum = (a) => Math.round(a.reduce((s, r) => s + (r.bytes ?? 0), 0) / 1024);
  await ev(axeSource);
  const axe = await ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }).then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, tags: v.tags.filter((t) => /wcag|best/.test(t)).join(","), count: v.nodes.length, help: v.help, targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ") + (n.failureSummary ? " :: " + n.failureSummary.replace(/\\s+/g, " ").slice(0, 160) : "")) })))`);
  const structure = await ev(`(() => {
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const interactive = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=radio], [role=checkbox], [tabindex]:not([tabindex='-1'])")].filter(visible);
    const small24 = [], small44 = [];
    for (const el of interactive) {
      const r = el.getBoundingClientRect();
      if (el.closest(".monaco-editor")) continue;
      const label = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("title") || el.tagName).trim().replace(/\\s+/g, " ").slice(0, 40);
      // An inline link inside a sentence is exempt from the size rule
      const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
      if (!inline && (r.width < 24 || r.height < 24)) small24.push(label + " " + Math.round(r.width) + "x" + Math.round(r.height));
      else if (!inline && (r.width < 44 || r.height < 44)) small44.push(label);
    }
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible).map((h) => h.tagName);
    let skips = 0; for (let i = 1; i < headings.length; i++) if (+headings[i][1] - +headings[i - 1][1] > 1) skips++;
    const overflow = document.documentElement.scrollWidth - window.innerWidth;
    const wide = overflow > 1 ? [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 && visible(el); }).slice(0, 5).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 3).join(".") : "")) : [];
    return {
      title: document.title,
      lang: document.documentElement.lang,
      h1: headings.filter((h) => h === "H1").length,
      headingSkips: skips,
      landmarks: { main: document.querySelectorAll("main").length, nav: document.querySelectorAll("nav").length, header: document.querySelectorAll("header").length, footer: document.querySelectorAll("footer").length },
      skipLink: !!document.querySelector("a[href='#main'], a[href='#content'], a[href^='#main']"),
      overflowPx: overflow,
      overflowing: wide,
      imagesWithoutAlt: [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length,
      svgsUnlabelled: [...document.querySelectorAll("svg")].filter((s) => !s.getAttribute("aria-hidden") && !s.getAttribute("aria-label") && !s.querySelector("title") && s.getAttribute("role") !== "presentation").length,
      interactive: interactive.length,
      targetsUnder24: small24.slice(0, 12),
      targetsUnder24Count: small24.length,
      targetsUnder44Count: small44.length,
      domNodes: document.querySelectorAll("*").length,
    };
  })()`);
  results.push({ key, path: await ev("location.pathname"), viewport: vp, theme, timing: { ...timing, lcp, cls }, bytesKB: { js: sum(js), jsFiles: js.length, css: sum(css), fonts: sum(fonts), images: sum(imgs), total: sum(net) }, axe, structure, consoleErrors: [...new Set(errors)].slice(0, 5) });
  console.log("audited", key, vp, theme, "axe:", (axe ?? []).length, "overflow:", structure?.overflowPx);
}

try {
  db("existing", LEARNER);
  db("pass-lesson", LEARNER, "running-python");
  const lesson = db("lesson-id", "running-python");
  const moduleId = db("module-id", "1");
  const drill = db("drill-id", "hello-pylearn");
  const submission = db("capstone-submission", LEARNER);
  db("examiner", EXAMINER);

  await send("Network.clearBrowserCookies");
  for (const vp of ["desktop", "mobile"]) {
    await audit("landing", "/", vp);
    await audit("signup", "/auth/signup", vp);
    await audit("signin", "/auth/signin", vp);
    await audit("privacy", "/privacy", vp);
  }
  await audit("landing", "/", "desktop", "dark");

  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: BASE + "/auth/signin" });
  await sleep(4000);
  await fill("#email", LEARNER);
  await fill("#password", PASSWORD);
  await ev(`document.querySelector("form button[type=submit]").click()`);
  await waitFor(`location.pathname === "/dashboard"`, 60);
  const pages = [["dashboard", "/dashboard"], ["syllabus", "/modules"], ["module", `/modules/${moduleId}`], ["lesson", `/lessons/${lesson}`], ["drill", `/exercises/${drill}`], ["review", "/review"], ["log", "/log"], ["achievements", "/achievements"], ["profile", "/profile"], ["settings", "/settings"], ["onboarding", "/onboarding"]];
  for (const [key, path] of pages) {
    await audit(key, path, "desktop");
    await audit(key, path, "mobile");
  }
  for (const [key, path] of [["dashboard", "/dashboard"], ["lesson", `/lessons/${lesson}`], ["drill", `/exercises/${drill}`], ["settings", "/settings"]]) await audit(key, path, "desktop", "dark");

  await send("Network.clearBrowserCookies");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: BASE + "/auth/signin" });
  await sleep(4000);
  await fill("#email", EXAMINER);
  await fill("#password", PASSWORD);
  await ev(`document.querySelector("form button[type=submit]").click()`);
  await waitFor(`location.pathname === "/dashboard"`, 60);
  for (const [key, path] of [["admin", "/admin"], ["admin-ai", "/admin/ai"], ["admin-content", "/admin/content"], ["evaluate", `/admin/projects/${submission}/evaluate`]]) {
    await audit(key, path, "desktop");
  }
  await audit("evaluate", `/admin/projects/${submission}/evaluate`, "mobile");
} catch (e) {
  results.push({ error: String((e && e.stack) || e) });
} finally {
  const cleanup = db("cleanup", LEARNER, EXAMINER);
  writeFileSync(new URL("audit.json", OUT), JSON.stringify({ base: BASE, cleanup, results }, null, 2));
  console.log("cleanup", cleanup);
  ws.close();
  chrome.kill();
  process.exit(0);
}
