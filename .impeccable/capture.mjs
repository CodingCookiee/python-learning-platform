// Dev-only capture script: drives headless Chrome over CDP.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("./review/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE ?? "http://localhost:3000";
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=" + process.env.TEMP + "\\pylearn-cdp",
  "about:blank",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome did not start");
}

const ws = new WebSocket(await connect());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
const consoleIssues = [];
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) {
    consoleIssues.push(msg.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 200));
  } else if (msg.method === "Runtime.exceptionThrown") {
    consoleIssues.push("EXCEPTION " + msg.params.exceptionDetails.text);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result
    ?.result?.value;

await send("Page.enable");
await send("Runtime.enable");

async function setup(width, height, scheme) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: scheme }],
  });
}

async function go(path) {
  await send("Page.navigate", { url: BASE + path });
  await sleep(4500);
}

async function shot(name, fullPage) {
  let clip;
  if (fullPage) {
    const h = await evaluate("document.documentElement.scrollHeight");
    const w = await evaluate("document.documentElement.clientWidth");
    clip = { x: 0, y: 0, width: w, height: h, scale: 1 };
  }
  const res = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: Boolean(fullPage),
    ...(clip ? { clip } : {}),
  });
  writeFileSync(new URL(name, OUT), Buffer.from(res.result.data, "base64"));
  console.log("saved", name);
}

/** The landing sandbox: on to step 2, fix the missing quote, run the tests */
async function solveSandbox() {
  const sandbox = `document.querySelector("section[aria-labelledby=try-it-heading]")`;
  const press = (label) =>
    evaluate(`[...${sandbox}.querySelectorAll("button")].find((b) => b.textContent.trim() === ${JSON.stringify(label)}).click()`);
  await press("Next");
  await sleep(300);
  await evaluate(`(() => {
    const ta = document.querySelector('#try-it-code');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'print("Welcome to the café!")');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(300);
  await press("Run tests");
  for (let i = 0; i < 90; i++) {
    const done = await evaluate(`document.body.innerText.includes('Stripe earned')`);
    if (done) break;
    await sleep(1000);
  }
  await sleep(1200);
}

// Desktop light
await setup(1440, 900, "light");
await go("/");
await shot("desktop-viewport.png");
await shot("desktop.png", true);
await solveSandbox();
await shot("drill-passed-desktop.png");

// Desktop dark
await setup(1440, 900, "dark");
await go("/");
await shot("desktop-dark.png", true);

// Mobile light at a true 390px viewport
await setup(390, 844, "light");
await go("/");
await shot("mobile.png", true);
await solveSandbox();
// Below the sticky navbar
await evaluate(`scrollTo(0, document.querySelector("section[aria-labelledby=try-it-heading]").getBoundingClientRect().top + scrollY - 72)`);
await sleep(500);
await shot("drill-passed-mobile.png");

// Auth pages
await setup(1440, 900, "light");
await go("/auth/signup");
await shot("signup.png");
await setup(1440, 900, "dark");
await go("/auth/signin");
await shot("signin-dark.png");

console.log("console issues:", consoleIssues.length ? consoleIssues : "none");
ws.close();
chrome.kill();
process.exit(0);
