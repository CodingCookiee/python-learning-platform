// Dev-only: measures layout stability of the landing sandbox's Run tests row when re-running after an error.
//   BASE=http://localhost:3010 node .impeccable/flash-test.mjs   (default: the dev server on :3000)
import { spawn } from "node:child_process";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9334;
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp-flash",
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
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
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

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: (process.env.BASE ?? "http://localhost:3000") + "/" });
await sleep(4500);

// The landing sandbox's step 2: its code box and the Run tests button
const SANDBOX = `document.querySelector("section[aria-labelledby=try-it-heading]")`;
const button = (label) => `[...${SANDBOX}.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(label)})`;
const setCode = (code) =>
  ev(`(() => { const ta = document.querySelector('#try-it-code');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta, ${JSON.stringify(code)});
    ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const waitIdle = async () => {
  for (let i = 0; i < 120; i++) {
    if (await ev(`!${SANDBOX}.querySelector('[aria-busy="true"]') && !${SANDBOX}.innerText.includes("Loading Python")`)) return;
    await sleep(250);
  }
};

await ev(`${button("Next")}.click()`);
await sleep(300);

// 1) First run of the tests on the broken line (also warms up Pyodide)
await setCode('print("Welcome to the café!)');
await sleep(200);
await ev(`${button("Run tests")}.click()`);
await sleep(500);
await waitIdle();
console.log("after first run, error shown:", await ev(`!!${SANDBOX}.innerText.match(/SyntaxError/)`));

// 2) Run the tests again and sample the button row every 20ms while it runs
const samples = await ev(`new Promise((resolve) => {
  const btn = ${button("Run tests")};
  const row = btn.parentElement;
  const out = [];
  const t0 = performance.now();
  const tick = () => {
    const r = row.getBoundingClientRect();
    out.push({ t: Math.round(performance.now() - t0), top: Math.round(r.top), btnW: Math.round(btn.getBoundingClientRect().width), op: getComputedStyle(btn).opacity, label: btn.textContent.trim() });
    if (performance.now() - t0 < 600) setTimeout(tick, 20); else resolve(out);
  };
  btn.click();
  tick();
})`);
const tops = new Set(samples.map((s) => s.top));
const widths = new Set(samples.map((s) => s.btnW));
const ops = new Set(samples.map((s) => s.op));
console.log("samples:", samples.length, "labels seen:", [...new Set(samples.map((s) => s.label))]);
console.log("button row top positions:", [...tops]);
console.log("button widths:", [...widths], "opacities:", [...ops]);
console.log(tops.size === 1 && widths.size === 1 && ops.size === 1 ? "STABLE: no layout jump" : "UNSTABLE");
ws.close();
chrome.kill();
process.exit(0);
