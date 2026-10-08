// Dev-only: the quest's step 5 tour on the dashboard, where the pointer's ring around the wide rank
// card meets the quest panel. The panel must sit above the ring.
//   BASE=http://localhost:3010 node .impeccable/quest-tour-check.mjs
// A throwaway learner on step 5 (deleted at the end); dark theme, the owner's screenshot size.
import { execSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/quest/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3010";
const PORT = 9341;
const EMAIL = `quest-tour-${Date.now()}@example.invalid`;

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-tour", "about:blank"]);
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
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitFor = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await ev(expr)) return true; await sleep(500); } return false; };
const clickText = (selector, text) => ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => b.textContent.includes(${JSON.stringify(text)})); el?.click(); return !!el; })()`);
const fill = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const report = [];

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1325, height: 531, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });

try {
  db("tour", EMAIL);
  await send("Page.navigate", { url: BASE + "/auth/signin" });
  await sleep(5000);
  await ev(`localStorage.removeItem("pylearn:quest-panel")`);
  await fill("#email", EMAIL);
  await fill("#password", "E2e-Quest-2026");
  await clickText("button[type=submit]", "Sign in");
  await waitFor(`location.pathname === "/dashboard"`, 60);
  await sleep(4000);
  await waitFor(`!!document.querySelector("section[data-quest-panel]")`, 20);
  await clickText("section[data-quest-panel] button", "Show me");
  await sleep(2000);
  await send("Page.captureScreenshot", { format: "png" }).then((r) => writeFileSync(new URL("tour-layering.png", OUT), Buffer.from(r.result.data, "base64")));
  report.push({
    step: "tour",
    ring: await ev(`(() => { const r = document.querySelector("[class*=animate-quest-pulse]"); return r && { z: getComputedStyle(r).zIndex }; })()`),
    panel: await ev(`(() => { const p = document.querySelector("section[data-quest-panel]"); return p && { z: getComputedStyle(p).zIndex }; })()`),
    // Where the ring's box and the panel's box overlap, is the panel what paints on top?
    overlapTop: await ev(`(() => {
      const ring = document.querySelector("[class*=animate-quest-pulse]")?.getBoundingClientRect();
      const panel = document.querySelector("section[data-quest-panel]")?.getBoundingClientRect();
      if (!ring || !panel) return null;
      const x = Math.max(ring.left, panel.left) + 3, y = Math.max(ring.top, panel.top) + 3;
      if (x > Math.min(ring.right, panel.right) || y > Math.min(ring.bottom, panel.bottom)) return "no overlap";
      // The ring takes no clicks, so make it hit-testable for a moment to see what's on top
      const el = document.querySelector("[class*=animate-quest-pulse]");
      el.parentElement.style.pointerEvents = "auto"; el.style.pointerEvents = "auto";
      const top = document.elementFromPoint(x, y);
      el.parentElement.style.pointerEvents = ""; el.style.pointerEvents = "";
      return top?.closest("section[data-quest-panel]") ? "panel" : top === el ? "ring" : top?.tagName;
    })()`),
  });
} catch (e) {
  report.push({ step: "crashed", error: String(e && e.stack || e) });
} finally {
  report.push({ step: "cleanup", result: db("cleanup", EMAIL) });
  for (const r of report) console.log(JSON.stringify(r));
  ws.close();
  chrome.kill();
  process.exit(0);
}
