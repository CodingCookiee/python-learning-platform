// Dev-only: measures layout stability of the landing drill when re-submitting after an error.
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
await send("Page.navigate", { url: "http://localhost:3000/" });
await sleep(4500);

const setCode = (code) =>
  ev(`(() => { const ta = document.querySelector('#drill-code');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(ta, ${JSON.stringify(code)});
    ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const clickSubmit = () =>
  ev(`[...document.querySelectorAll('button')].find(b => /Submit drill|Grading|Loading Python/.test(b.textContent)).click()`);
const waitIdle = async () => {
  for (let i = 0; i < 120; i++) {
    if (await ev(`!document.querySelector('[aria-busy="true"]')`)) return;
    await sleep(250);
  }
};

// 1) First submit with a syntax error (also warms up Pyodide)
await setCode("def greet(name)\n    return 1\n");
await sleep(200);
await clickSubmit();
await sleep(500);
await waitIdle();
console.log("after first submit, error shown:", await ev(`!!document.body.innerText.match(/SyntaxError/)`));

// 2) Re-submit and sample the button row every 20ms while grading
const samples = await ev(`new Promise((resolve) => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Submit drill'));
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
