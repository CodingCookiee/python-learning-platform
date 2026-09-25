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
for (let i = 0; i < 40; i++) {
  if ((await ev("location.pathname")) === "/dashboard") break;
  await sleep(500);
}
await sleep(3000);

const pages = [
  ["/dashboard", "dashboard"],
  ["/profile", "profile"],
  ["/settings", "settings"],
  ["/achievements", "achievements"],
  ["/admin", "admin"],
  ["/admin/projects", "admin-submissions"],
  ["/admin/content", "admin-content"],
];
for (const [path, name] of pages) {
  await go(path);
  await shot(`${name}.png`);
}
await setup(1440, 900, "dark");
for (const [path, name] of [["/dashboard", "dashboard"], ["/profile", "profile"], ["/admin", "admin"]]) {
  await go(path);
  await shot(`${name}-dark.png`);
}
await setup(390, 844, "light");
for (const [path, name] of [["/profile", "profile"], ["/settings", "settings"]]) {
  await go(path);
  await shot(`${name}-mobile.png`);
}
console.log("console issues:", issues.length ? [...new Set(issues)] : "none");
ws.close();
chrome.kill();
process.exit(0);
