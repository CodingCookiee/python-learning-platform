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
// A stale session (e.g. a deleted test account) would redirect away from the form
await send("Network.clearBrowserCookies");
await go("/auth/signin", 4000);
await ev(`(() => {
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); };
  set(document.querySelector('#email'), 'design-review@pylearn.local');
  set(document.querySelector('#password'), 'ReviewPass!2026');
})()`);
await sleep(300);
await ev(`document.querySelector('form button[type=submit]').click()`);
for (let i = 0; i < 120; i++) {
  if ((await ev("location.pathname")) === "/dashboard") break;
  await sleep(500);
}
await sleep(3000);

const ids = JSON.parse((await import("node:fs")).readFileSync(process.env.TEMP + "/review-ids.json", "utf8"));
// SHOTS="path|name|scheme;path|name|scheme" captures specific pages only
if (process.env.SHOTS) {
  for (const spec of process.env.SHOTS.split(";")) {
    const [path, name, scheme = "light", width = "1440"] = spec.split("|");
    await setup(Number(width), Number(width) < 600 ? 844 : 900, scheme);
    await go(path, 6000);
    await shot(name);
  }
  console.log("SHOTS console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 200)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.MENU) {
  await setup(390, 844, "light");
  await go(`/dashboard`, 8000);
  const clicked = await ev(`(() => { const b = document.querySelector('button[aria-label="Open navigation menu"]'); b?.click(); return !!b; })()`);
  await sleep(1200);
  console.log("MENU clicked:", clicked, "open:", await ev(`!!document.querySelector('[aria-label="Mobile navigation"]')`));
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("mobile-menu.png", OUT), Buffer.from(r.result.data, "base64"));
  await setup(1440, 900, "light");
  await go(`/modules/does-not-exist`);
  await shot("not-found-app.png");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.FINAL) {
  const exId = process.env.FINAL;
  await go(`/exercises/${exId}`, 7000);
  await shot("exercise.png");
  // Solve the drill and grade it
  const graded = await ev(`(async () => {
    const btn = [...document.querySelectorAll('button')].find(b => /Run & Test/.test(b.textContent));
    if (!btn) return 'no run button';
    btn.click();
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (/tests passed/.test(document.body.innerText)) return document.body.innerText.match(/\\d+\\/\\d+ tests passed/)[0];
    }
    return 'timeout';
  })()`);
  console.log("FINAL drill (starter code):", graded);
  await sleep(800);
  await shot("exercise-run.png");
  await go(`/projects/${ids.project}/submit`);
  await shot("project-submit.png");
  await go(`/admin/projects`);
  await shot("admin-submissions.png");
  const evalHref = await ev(`document.querySelector('a[href*="/evaluate"]')?.getAttribute('href') ?? null`);
  if (evalHref) {
    await go(evalHref);
    await shot("admin-evaluate.png");
    if (process.env.STAMP) {
      // Grade it: tick every criterion, write feedback, approve, catch the seal mid-stamp
      await ev(`(() => {
        document.querySelectorAll('button[aria-pressed="false"]').forEach((b) => b.click());
        const t = document.querySelector('textarea[placeholder^="Type the output"]');
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'Clean structure and clear names. Next, add tests for the edge cases.');
        t.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);
      await sleep(400);
      await shot("admin-evaluate-filled.png");
      await ev(`[...document.querySelectorAll('button')].find(b => /Approve and stamp/.test(b.textContent))?.click()`);
      await sleep(500);
      await ev(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Approve')?.click()`);
      for (let i = 0; i < 150; i++) {
        await sleep(100);
        if (await ev(`Boolean(document.querySelector('[aria-label="Passed: Capstone graded"]'))`)) break;
      }
      await sleep(350);
      const st = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(new URL("admin-evaluate-stamp.png", OUT), Buffer.from(st.result.data, "base64"));
    }
  }
  await go(`/modules/does-not-exist`);
  await shot("not-found-app.png");
  await go(`/this-page-does-not-exist`);
  await shot("not-found-root.png");
  await go(`/dashboard`);
  await ev(`[...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.startsWith('Search'))?.click()`);
  await sleep(600);
  await ev(`(() => { const i = document.querySelector('input[aria-label="Search query"]'); if (!i) return; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'list'); i.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(2500);
  const r1 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("search-open.png", OUT), Buffer.from(r1.result.data, "base64"));
  await setup(390, 844, "light");
  await go(`/dashboard`);
  await ev(`[...document.querySelectorAll('button')].find(b => /menu/i.test(b.getAttribute('aria-label') ?? ''))?.click()`);
  await sleep(700);
  const r2 = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("mobile-menu.png", OUT), Buffer.from(r2.result.data, "base64"));
  await setup(1440, 900, "dark");
  await go(`/exercises/${exId}`, 7000);
  await shot("exercise-dark.png");
  console.log("FINAL console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.RUNTEST) {
  await go(`/lessons/${ids.lesson}`, 6000);
  const report = await ev(`(async () => {
    const blocks = [...document.querySelectorAll('div.my-6')];
    const target = blocks.filter(b => [...b.querySelectorAll('button')].some(x => x.textContent.trim() === 'Run'))[1];
    if (!target) return 'no second runnable block';
    const btn = [...target.querySelectorAll('button')].find(x => x.textContent.trim() === 'Run');
    target.scrollIntoView({ block: 'center' });
    btn.click();
    const t0 = performance.now();
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 500));
      const out = target.querySelector('[aria-live=polite]');
      if (out && !out.className.includes('opacity-55')) {
        return 'after ' + Math.round((performance.now() - t0) / 1000) + 's: ' + out.textContent.slice(0, 160);
      }
    }
    return 'timeout; button now: ' + btn.textContent.trim();
  })()`);
  console.log("RUNTEST", report);
  console.log(
    "RUNTEST resources:",
    await ev(`performance.getEntriesByType('resource').filter(r => r.name.includes('pyodide')).map(r => r.name.split('/').pop() + ' ' + Math.round(r.duration) + 'ms ' + r.transferSize + 'B').join(' | ')`)
  );
  console.log("RUNTEST console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 400)) : "none");
  console.log(
    "RUNTEST direct load:",
    await ev(`(async () => {
      const t0 = performance.now();
      try {
        const race = await Promise.race([
          window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/" }).then(() => "loaded"),
          new Promise((r) => setTimeout(() => r("still pending"), 60000)),
        ]);
        return race + " after " + Math.round((performance.now() - t0) / 1000) + "s";
      } catch (e) {
        return "threw: " + e.message;
      }
    })()`)
  );
  console.log(
    "RUNTEST pyodide:",
    await ev(`JSON.stringify({ script: !!document.querySelector('script[src*="pyodide"]'), loader: typeof window.loadPyodide })`)
  );
  await sleep(400);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL("lesson-run.png", OUT), Buffer.from(r.result.data, "base64"));
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.FLOW) {
  // Exercise the new drill workspace end to end, like a learner would
  const d = ids.drills;
  const waitFor = async (expr, tries = 90) => {
    for (let i = 0; i < tries; i++) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    return false;
  };
  // Exact label first, then prefix; waits until Python has loaded (the button reads "Loading Python…" until then)
  const click = async (label) => {
    await waitFor(`!/Loading Python/.test(document.body.innerText)`, 120);
    return ev(`(() => { const bs = [...document.querySelectorAll('button')]; const b = bs.find(b => b.textContent.trim() === ${JSON.stringify(label)}) ?? bs.find(b => b.textContent.trim().startsWith(${JSON.stringify(label)})); if (b) b.click(); return !!b; })()`);
  };
  const setEditor = (code) =>
    ev(`(() => { const m = window.monaco?.editor?.getModels?.()[0]; if (!m) return false; m.setValue(${JSON.stringify(code)}); return true; })()`);
  const resultText = () => ev(`[...document.querySelectorAll('[aria-live=polite]')].map(n => n.innerText).join(' | ').slice(0, 600)`);

  // Function drill: starter fails, then the reference answer passes
  await go(`/exercises/${d["swap-two-values"]}`, 6000);
  await waitFor(`!!window.monaco?.editor?.getModels?.()[0]`);
  await shot("flow-drill-function.png");
  await click("Run tests");
  await waitFor(`/tests passed/.test(document.body.innerText)`);
  console.log("function starter:", await resultText());
  await shot("flow-drill-function-fail.png");
  console.log("set editor:", await setEditor("def swap(a, b):\n    return b, a\n"));
  await click("Run tests");
  await waitFor(`/Drill passed/.test(document.body.innerText)`, 60);
  console.log("function solution:", await resultText());
  await shot("flow-drill-function-pass.png");

  // Program drill with stdin, and Run with input
  await go(`/exercises/${d["hello-pylearn"]}`, 6000);
  await waitFor(`!!window.monaco?.editor?.getModels?.()[0]`);
  await setEditor('print("Hello, pylearn!")\nprint("Lets train.")\n');
  await click("Run tests");
  await waitFor(`/tests passed/.test(document.body.innerText)`);
  console.log("program:", await resultText());
  await shot("flow-drill-program.png");

  // A runaway loop: the runtime must stop it and recover
  await setEditor("while True:\n    pass\n");
  await click("Run");
  await waitFor(`/Timed out|Stopped after/.test(document.body.innerText)`, 40);
  console.log("loop:", await resultText());
  await setEditor('print("Hello, pylearn!")\n');
  await click("Run");
  await waitFor(`/Hello, pylearn!/.test([...document.querySelectorAll('[aria-live=polite]')].map(n=>n.innerText).join(''))`, 60);
  console.log("after loop:", await resultText());

  // Predict drill: wrong then right
  await go(`/exercises/${d["predict-print-arguments"]}`, 6000);
  const typeAnswer = (text) =>
    ev(`(() => { const t = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t, ${JSON.stringify(text)}); t.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
  await typeAnswer("Total: 12\nA B C\ndone");
  await click("Check answer");
  await waitFor(`/Not quite|exactly what it prints/.test(document.body.innerText)`, 60);
  console.log("predict wrong:", await resultText());
  await shot("flow-drill-predict-wrong.png");
  await typeAnswer("Total:12\nA > B > C!\ndone");
  await click("Check answer");
  await waitFor(`/exactly what it prints/.test(document.body.innerText)`, 60);
  console.log("predict right:", await resultText());

  // Lessons, module, syllabus
  await go(`/lessons/${ids.lesson}`, 5000);
  await shot("flow-lesson-1.png");
  await go(`/lessons/${ids.lesson2}`, 5000);
  await ev(`[...document.querySelectorAll('section button[aria-pressed]')][0]?.click()`);
  await sleep(500);
  await shot("flow-lesson-2.png");
  await go(`/modules/${ids.module}`, 5000);
  await shot("flow-module.png");
  await go(`/modules`, 5000);
  await shot("flow-syllabus.png");
  console.log("FLOW console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.LOGDEBUG) {
  await send("Network.clearBrowserCookies");
  await go("/auth/signin", 4000);
  await ev(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); }; set(document.querySelector('#email'), 'five-probe@example.invalid'); set(document.querySelector('#password'), 'FiveProbe!2026'); })()`);
  await sleep(300);
  await ev(`document.querySelector('form button[type=submit]').click()`);
  for (let i = 0; i < 60 && (await ev("location.pathname")) !== "/dashboard"; i++) await sleep(500);
  await go(`/log`, 8000);
  console.log("buttons:", await ev(`[...document.querySelectorAll('form button')].map(b => b.type + ':' + b.textContent.trim() + (b.disabled ? '(disabled)' : '')).join(' | ')`));
  const r = await ev(`fetch('/api/log', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours: 9, built: 'x', learned: 'direct', stuck: '', nextGoal: 'y', question: '' }) }).then(async r => r.status + ' ' + (await r.text()).slice(0, 200))`);
  console.log("direct PUT:", r);
  await ev(`(() => { const t = document.querySelector('#log-learned'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t, 'via the button'); t.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(500);
  console.log("before click:", await ev(`[...document.querySelectorAll('form button')][0].textContent`));
  await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save this week')?.click()`);
  await sleep(3000);
  console.log("after click:", await ev(`[...document.querySelectorAll('form button')][0].textContent + ' / ' + (document.querySelector('[role=status]')?.innerText ?? 'no status')`));
  console.log("LOGDEBUG console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 400)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.FIVE) {
  // Learning log, multi-file drills, admin AI usage, black-belt rule, checkpoint topics (as the five-probe learner)
  const five = JSON.parse((await import("node:fs")).readFileSync(process.env.TEMP + "/five-ids.json", "utf8"));
  const fsx = await import("node:fs");
  const waitFor = async (expr, tries = 60) => {
    for (let i = 0; i < tries; i++) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    return false;
  };
  const view = async (name) => fsx.writeFileSync(new URL(name, OUT), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
  await send("Network.clearBrowserCookies");
  await go("/auth/signin", 4000);
  await ev(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); }; set(document.querySelector('#email'), 'five-probe@example.invalid'); set(document.querySelector('#password'), 'FiveProbe!2026'); })()`);
  await sleep(300);
  await ev(`document.querySelector('form button[type=submit]').click()`);
  await waitFor(`location.pathname === '/dashboard'`, 60);
  await sleep(3000);
  console.log("rank card:", await ev(`document.querySelector('section[aria-label^="Your rank"]')?.innerText.replace(/\\n+/g, ' | ').slice(0, 420)`));
  await shot("five-dashboard.png");

  await go(`/checkpoints/${five.failedCheckpoint}`, 6000);
  console.log("checkpoint topics:", await ev(`document.querySelector('#study-heading')?.closest('section')?.innerText.replace(/\\n+/g, ' | ').slice(0, 400)`));
  await ev(`document.querySelector('#study-heading')?.scrollIntoView({block:'center'})`);
  await sleep(400);
  await view("five-checkpoint-topics.png");

  for (const scheme of ["light", "dark"]) {
    await setup(1440, 900, scheme);
    await go(`/admin/ai`, 7000);
    if (scheme === "light") {
      console.log("admin ai:", await ev(`document.querySelector('dl')?.innerText.replace(/\\n+/g, ' | ').slice(0, 300)`));
      await ev(`document.querySelector('ol[aria-label="Tokens per day"] li:last-child')?.focus()`);
      await sleep(300);
      console.log("bar tooltip:", await ev(`document.querySelector('ol[aria-label="Tokens per day"] li:last-child [role=tooltip]')?.innerText.replace(/\\n/g, ' ')`));
    }
    await shot(`five-admin-ai-${scheme}.png`);
  }
  await setup(1440, 900, "light");

  await go(`/log`, 6000);
  console.log("log draft built:", await ev(`document.querySelector('#log-built')?.value.split('\\n')[0]`));
  await ev(`(() => { const t = document.querySelector('#log-learned'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t, 'Closures keep the variables of the scope they were made in.'); t.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(400);
  await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Save this week')?.click()`);
  await waitFor(`/Saved to your log/.test(document.body.innerText)`, 20);
  console.log("check-in preview:", await ev(`document.querySelector('aside pre')?.innerText.split('\\n').slice(0, 5).join(' / ')`));
  await go(`/log`, 5000);
  console.log("after reload learned:", await ev(`document.querySelector('#log-learned')?.value`));
  await shot("five-log.png");

  // Multi-file drill: solve both files through the tabs
  await go(`/exercises/${five.split}`, 7000);
  await waitFor(`!!window.monaco?.editor?.getModels?.().length`);
  console.log("tabs:", await ev(`[...document.querySelectorAll('[role=tab]')].map(t => t.textContent.trim()).join(', ')`));
  const setActive = (code) => ev(`(() => { const ms = window.monaco.editor.getModels(); ms[ms.length - 1].setValue(${JSON.stringify(code)}); return ms.length; })()`);
  await setActive("from pricing import bulk_discount, with_vat\n\n\ndef basket_total(items):\n    net = 0\n    for _name, unit_price, quantity in items:\n        net += bulk_discount(unit_price * quantity, quantity)\n    return with_vat(net)\n");
  await ev(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.includes('pricing.py'))?.click()`);
  await sleep(1500);
  await setActive("VAT_RATE = 0.2\n\n\ndef with_vat(net):\n    return round(net * (1 + VAT_RATE), 2)\n\n\ndef bulk_discount(net, quantity):\n    return round(net * 0.9, 2) if quantity >= 10 else net\n");
  await sleep(300);
  await view("five-multifile-pricing-tab.png");
  await waitFor(`!/Loading Python/.test(document.body.innerText)`, 120);
  await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Run tests')?.click()`);
  await waitFor(`/tests passed/.test(document.body.innerText)`, 90);
  await sleep(1500);
  console.log("multi-file result:", await ev(`(document.body.innerText.match(/\\d+ of \\d+ tests passed/) ?? [''])[0]`), "|", await ev(`/Drill passed/.test(document.body.innerText)`));
  await shot("five-multifile.png");
  await sleep(3500);
  // A fresh browser: the draft comes back from the server with both files
  await ev(`localStorage.clear()`);
  await go(`/exercises/${five.split}`, 7000);
  await waitFor(`!!window.monaco?.editor?.getModels?.().length`);
  await ev(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.includes('pricing.py'))?.click()`);
  await sleep(1500);
  console.log("pricing.py draft restored:", await ev(`(() => { const ms = window.monaco.editor.getModels(); return ms[ms.length - 1].getValue().includes('round(net * 0.9, 2)'); })()`));

  await go(`/exercises/${five.pkg}`, 7000);
  await waitFor(`!!document.querySelector('[role=tab]')`, 30);
  console.log("package tabs:", await ev(`[...document.querySelectorAll('[role=tab]')].map(t => (t.querySelector('[aria-label="Read-only"]') ? '🔒' : '') + t.textContent.trim()).join(', ')`));
  await ev(`[...document.querySelectorAll('[role=tab]')].find(t => t.textContent.includes('stock.py'))?.click()`);
  await sleep(1200);
  await view("five-package-readonly.png");
  console.log("FIVE console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.AXE) {
  // Accessibility scan (WCAG 2.2 A/AA rules) of the main signed-in pages, light and dark
  if (process.env.AXE_FIVE) {
    await send("Network.clearBrowserCookies");
    await go("/auth/signin", 4000);
    await ev(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); }; set(document.querySelector('#email'), 'five-probe@example.invalid'); set(document.querySelector('#password'), 'FiveProbe!2026'); })()`);
    await sleep(300);
    await ev(`document.querySelector('form button[type=submit]').click()`);
    for (let i = 0; i < 60 && (await ev("location.pathname")) !== "/dashboard"; i++) await sleep(500);
  }
  const axe = (await import("node:fs")).readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
  const pages = process.env.AXE_PAGES ? process.env.AXE_PAGES.split(";").map((p) => p.split("|")) : [
    ["/dashboard", "dashboard"],
    ["/modules", "syllabus"],
    [`/modules/${ids.module}`, "module"],
    [`/lessons/${ids.lesson2}`, "lesson"],
    [`/exercises/${ids.drills["swap-two-values"]}`, "drill"],
    ["/review", "review"],
    ["/settings", "settings"],
    ["/onboarding", "onboarding"],
    ["/achievements", "achievements"],
    ...(process.env.AXE_CP ? [[`/checkpoints/${process.env.AXE_CP}`, "checkpoint"]] : []),
    [`/projects/${ids.project}`, "capstone"],
  ];
  const report = [];
  for (const scheme of ["light", "dark"]) {
    await setup(1440, 900, scheme);
    for (const [path, name] of pages) {
      await go(path, 6000);
      await ev(axe);
      const res = await ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then(r => r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map(n => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\\n").slice(1, 2).join("")) })))`);
      report.push({ scheme, name, violations: res ?? "scan failed" });
    }
  }
  for (const r of report) {
    const v = Array.isArray(r.violations) ? r.violations : [];
    console.log(`${r.scheme.padEnd(5)} ${r.name.padEnd(12)} ${Array.isArray(r.violations) ? `${v.length} rule(s)` : r.violations}`);
    for (const x of v) console.log(`   [${x.impact}] ${x.id} (${x.nodes}): ${x.help}\n      ${x.sample.join("\n      ")}`);
  }
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.WORKSPACE) {
  // Server autosave of drill code, and the lesson scratchpad
  const d = ids.drills["swap-two-values"];
  const waitFor = async (expr, tries = 60) => {
    for (let i = 0; i < tries; i++) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    return false;
  };
  const marker = `# autosave ${Date.now()}`;
  await go(`/exercises/${d}`, 6000);
  await waitFor(`!!window.monaco?.editor?.getModels?.()[0]`);
  await ev(`window.monaco.editor.getModels()[0].setValue(${JSON.stringify(`def swap(a, b):\n    ${marker}\n    return b, a\n`)})`);
  await sleep(4500);
  // A new device: no local copy
  await ev(`localStorage.clear()`);
  await go(`/exercises/${d}`, 6000);
  await waitFor(`!!window.monaco?.editor?.getModels?.()[0]`);
  console.log("draft restored on a clean browser:", await ev(`window.monaco.editor.getModels()[0].getValue().includes(${JSON.stringify(marker)})`));

  await go(`/lessons/${ids.lesson2}`, 6000);
  await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Open scratchpad')?.click()`);
  await waitFor(`!!document.querySelector('#scratchpad')`, 10);
  const sent = await ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.title === 'Open this example in the scratchpad'); b?.click(); return !!b; })()`);
  await sleep(1500);
  console.log("example sent to scratchpad:", sent);
  await waitFor(`!/Loading Python/.test(document.body.innerText)`, 60);
  await ev(`document.querySelector('#scratchpad button')?.parentElement && [...document.querySelectorAll('#scratchpad button')].find(b => b.textContent.trim() === 'Run')?.click()`);
  await waitFor(`!!document.querySelector('#scratchpad [aria-live]')`, 60);
  await sleep(800);
  console.log("scratchpad output:", await ev(`document.querySelector('#scratchpad [aria-live]')?.innerText.slice(0, 200)`));
  await ev(`document.querySelector('#scratchpad')?.scrollIntoView({block:'nearest'})`);
  (await import("node:fs")).writeFileSync(new URL("lesson-scratchpad-view.png", OUT), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
  await shot("lesson-scratchpad.png");
  await setup(390, 844, "light");
  await go(`/lessons/${ids.lesson2}`, 6000);
  const r = await send("Page.captureScreenshot", { format: "png" });
  (await import("node:fs")).writeFileSync(new URL("lesson-scratchpad-mobile.png", OUT), Buffer.from(r.result.data, "base64"));
  console.log("WORKSPACE console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.LABFLOW) {
  // Onboarding for the review account, then labs as a learner who has opened every module
  const labs = JSON.parse((await import("node:fs")).readFileSync(process.env.TEMP + "/m4-labs.json", "utf8"));
  const waitFor = async (expr, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    return false;
  };
  const clickText = (text) =>
    ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})); b?.click(); return !!b; })()`);

  await go("/dashboard", 5000);
  console.log("dashboard sends a new learner to:", await ev("location.pathname"));
  await shot("onboarding.png");
  await clickText("I code in another language");
  await clickText("Python, then AI automation");
  await clickText("8 h");
  await sleep(300);
  await clickText("Start training");
  await waitFor(`location.pathname === '/dashboard'`, 30);
  await sleep(3000);
  console.log("after onboarding:", await ev("location.pathname"), "|", await ev(`document.querySelector('#week-heading')?.closest('section')?.innerText.replace(/\\n+/g, ' ').slice(0, 300)`));
  await shot("dashboard-pacing.png");

  // Lab tester
  await send("Network.clearBrowserCookies");
  await go("/auth/signin", 4000);
  await ev(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); }; set(document.querySelector('#email'), 'm4-labs@example.invalid'); set(document.querySelector('#password'), 'LabTester!2026'); })()`);
  await sleep(300);
  await ev(`document.querySelector('form button[type=submit]').click()`);
  await waitFor(`location.pathname === '/dashboard'`, 40);
  await sleep(1500);
  await go(`/lessons/${labs.webhooks}`, 6000);
  console.log("lab panel:", await ev(`document.querySelector('#lab-heading')?.closest('section')?.innerText.slice(0, 160).replace(/\\n+/g, ' | ')`));
  const post = (body) => fetch(labs.hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
  const wrong = await post({ id: "evt_1042", type: "form.submitted", data: { email: "someone@else.com" } });
  console.log("wrong body:", wrong.verified, wrong.notes);
  const right = await post({ id: "evt_1042", type: "form.submitted", data: { email: "amira@example.com" }, extra: true });
  console.log("right body:", right.verified, right.newlyVerified, right.notes);
  const again = await post({ id: "evt_1042", type: "form.submitted", data: { email: "amira@example.com" } });
  console.log("again (no double XP):", again.newlyVerified);
  await clickText("Check for my request");
  await sleep(2500);
  console.log("panel after:", await ev(`document.querySelector('#lab-heading')?.closest('section')?.innerText.slice(0, 260).replace(/\\n+/g, ' | ')`));
  await ev(`document.querySelector('#lab-heading')?.scrollIntoView({ block: 'start' })`);
  await sleep(500);
  const r = await send("Page.captureScreenshot", { format: "png" });
  (await import("node:fs")).writeFileSync(new URL("lab-webhook.png", OUT), Buffer.from(r.result.data, "base64"));

  await go(`/lessons/${labs["code-quality-tools"]}`, 6000);
  await ev(`(() => { const t = document.querySelector('#lab-output'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t, 'All checks passed!\\nSuccess: no issues found in 1 source file'); t.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await sleep(300);
  await ev(`[...document.querySelector('#lab-heading').closest('section').querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')?.click()`);
  await sleep(2500);
  await ev(`document.querySelector('#lab-heading')?.scrollIntoView({ block: 'start' })`);
  await sleep(400);
  (await import("node:fs")).writeFileSync(new URL("lab-output.png", OUT), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
  console.log("direct check:", await ev(`fetch('/api/labs/${labs["code-quality-tools"]}/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ output: 'All checks passed!\nSuccess: no issues found in 1 source file' }) }).then(async r => r.status + ' ' + (await r.text()).slice(0, 400))`));
  console.log("button disabled:", await ev(`[...document.querySelector('#lab-heading').closest('section').querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')?.disabled`), "textarea:", await ev(`document.querySelector('#lab-output')?.value.length`));
  console.log("output lab:", await ev(`document.querySelector('#lab-heading')?.closest('section')?.innerText.slice(0, 700).replace(/\\n+/g, ' | ')`));
  console.log("LABFLOW console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.EMAILFLOW) {
  // Sign-in codes, email confirmation, password reset and forgot-password, signed out
  const tokens = JSON.parse((await import("node:fs")).readFileSync(process.env.TEMP + "/m4-email-tokens.json", "utf8"));
  const waitFor = async (expr, tries = 40) => {
    for (let i = 0; i < tries; i++) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    return false;
  };
  const fill = (pairs) =>
    ev(`(() => { const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); }; ${pairs
      .map(([sel, v]) => `set(document.querySelector(${JSON.stringify(sel)}), ${JSON.stringify(v)});`)
      .join(" ")} })()`);
  const clickText = (text) =>
    ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); b?.click(); return !!b; })()`);
  const signInAs = async (email, password) => {
    await send("Network.clearBrowserCookies");
    await go("/auth/signin", 4000);
    await fill([["#email", email], ["#password", password]]);
    await sleep(300);
    await ev(`document.querySelector('form button[type=submit]').click()`);
    await waitFor(`location.pathname === '/dashboard' || !!document.querySelector('[role=alert]')`, 40);
    await sleep(800);
    return ev(`location.pathname === '/dashboard' ? 'dashboard' : document.querySelector('[role=alert]')?.innerText`);
  };

  console.log("unverified sign-in:", await signInAs("m4-unverified@example.invalid", "Unverified!2026"));
  console.log("resend button:", await ev(`[...document.querySelectorAll('button')].some(b => b.textContent.includes('Send the link again'))`));
  await shot("email-signin-unverified.png");
  await clickText("Send the link again");
  await sleep(2000);
  console.log("resend result:", await ev(`document.querySelector('form')?.innerText.split('\\n').filter(l => /link|set up/i.test(l)).join(' | ')`));

  await go(`/auth/verify-email?token=${tokens.verifyToken}`, 4000);
  await shot("email-verify.png");
  await clickText("Confirm my email");
  console.log("confirmed:", await waitFor(`/Email confirmed/.test(document.body.innerText)`, 20));
  console.log("reuse link:", await (async () => { await go(`/auth/verify-email?token=${tokens.verifyToken}`, 3000); await clickText("Confirm my email"); await sleep(2000); return ev(`document.querySelector('[role=alert]')?.innerText`); })());
  console.log("verified sign-in:", await signInAs("m4-unverified@example.invalid", "Unverified!2026"));

  await send("Network.clearBrowserCookies");
  await go(`/auth/reset-password?token=${tokens.resetToken}`, 4000);
  await shot("email-reset.png");
  await fill([["#reset-password", "BrandNew!2026"], ["#reset-confirm", "BrandNew!2026"]]);
  await clickText("Set the new password");
  await waitFor(`location.search.includes('reset=1')`, 20);
  await sleep(1000);
  console.log("after reset:", await ev(`location.pathname + location.search`), "|", await ev(`document.querySelector('[role=status]')?.innerText`));
  await shot("email-signin-after-reset.png");
  console.log("old password:", await signInAs("m4-reset@example.invalid", "Unverified!2026"));
  console.log("new password:", await signInAs("m4-reset@example.invalid", "BrandNew!2026"));

  await send("Network.clearBrowserCookies");
  await go("/auth/forgot-password", 4000);
  await fill([["#forgot-email", "m4-reset@example.invalid"]]);
  await clickText("Send the reset link");
  await sleep(2000);
  console.log("forgot (no email configured):", await ev(`document.querySelector('[role=alert]')?.innerText ?? document.body.innerText.match(/Check your inbox/)?.[0]`));
  await shot("email-forgot.png");
  console.log("EMAILFLOW console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.CHECKPOINT) {
  // Take module 1's checkpoint as a placement test, solving each drill with its reference solution
  const pg = (await import("pg")).default;
  (await import("dotenv")).config({ path: process.cwd() + "/.env", quiet: true });
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const waitFor = async (expr, tries = 90) => {
    for (let i = 0; i < tries; i++) {
      if (await ev(expr)) return true;
      await sleep(500);
    }
    return false;
  };
  const click = async (label) => {
    await waitFor(`!/Loading Python/.test(document.body.innerText)`, 120);
    return ev(`(() => { const bs = [...document.querySelectorAll('button')]; const b = bs.find(b => b.textContent.trim() === ${JSON.stringify(label)}) ?? bs.find(b => b.textContent.trim().startsWith(${JSON.stringify(label)})); if (b) b.click(); return !!b; })()`);
  };
  const setEditor = (code) =>
    ev(`(() => { const m = window.monaco?.editor?.getModels?.()[0]; if (!m) return false; m.setValue(${JSON.stringify(code)}); return true; })()`);

  await go(`/modules/${ids.module}`, 6000);
  await shot("cp-module.png");
  console.log("test out:", await click("Test out"));
  await waitFor(`location.pathname.startsWith('/checkpoints/')`, 40);
  await sleep(2500);
  const attemptPath = await ev("location.pathname");
  await shot("cp-attempt.png");
  const drillIds = await ev(`[...document.querySelectorAll('ol a[href^="/exercises/"]')].map(a => a.getAttribute('href').split('/').pop())`);
  console.log("drills:", drillIds.length);
  const sols = (await db.query(`select id, solution from exercises where id = any($1)`, [drillIds])).rows;
  const byId = Object.fromEntries(sols.map((r) => [r.id, r.solution]));
  for (const [i, dId] of drillIds.entries()) {
    await go(`/exercises/${dId}`, 5000);
    await waitFor(`!!window.monaco?.editor?.getModels?.()[0]`);
    if (i === 0) {
      console.log("banner:", await ev(`document.body.innerText.includes('No hints and no reference solution')`));
      console.log("hints shown:", await ev(`/Show a hint/.test(document.body.innerText)`));
      await shot("cp-drill.png");
    }
    await setEditor(byId[dId]);
    await click("Run tests");
    const ok = await waitFor(`/Drill passed|Checkpoint passed|Checkpoint closed/.test(document.body.innerText)`, 90);
    console.log(`drill ${i + 1}:`, ok ? await ev(`(document.body.innerText.match(/(Drill passed|Checkpoint passed|Checkpoint closed)[^\\n]*\\n[^\\n]*/) ?? [''])[0]`) : await ev(`[...document.querySelectorAll('[aria-live=polite]')].map(n => n.innerText).join(' | ').slice(0, 400)`));
    if (i === drillIds.length - 1) await shot("cp-drill-last.png");
  }
  await go(attemptPath, 5000);
  await shot("cp-result.png");
  await go(`/modules/${ids.module}`, 5000);
  await shot("cp-module-after.png");
  await go(`/review`, 5000);
  await shot("cp-review.png");
  await go(`/dashboard`, 6000);
  await shot("cp-dashboard.png");
  await setup(390, 844, "dark");
  await go(attemptPath, 5000);
  await shot("cp-result-mobile-dark.png");
  await db.end();
  console.log("CHECKPOINT console:", issues.length ? [...new Set(issues)].map((x) => x.slice(0, 300)) : "none");
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.EVAL) {
  if (process.env.SIGNED_OUT) await send("Network.clearBrowserCookies");
  // EVAL="<path>|<js expression>": print the expression's value on that page
  // EVAL="<path>" with EVAL_FILE=<file holding the expression>, or EVAL="<path>|<expr>"
  const [path, inline] = process.env.EVAL.split(/\|(.*)/s);
  const expr = process.env.EVAL_FILE
    ? (await import("node:fs")).readFileSync(process.env.EVAL_FILE, "utf8")
    : inline;
  await go(path);
  console.log("EVAL ->", JSON.stringify(await ev(expr)));
  ws.close();
  chrome.kill();
  process.exit(0);
}
if (process.env.PROBE) {
  for (const url of [`/api/lessons/${ids.lesson}`, `/api/modules/${ids.module}`]) {
    const out = await ev(
      `fetch(${JSON.stringify(url)}).then(async (r) => r.status + " " + (await r.text()).slice(0, 500))`
    );
    console.log("PROBE", url, "->", out);
  }
  ws.close();
  chrome.kill();
  process.exit(0);
}
const pages = [
  ["/dashboard", "dashboard"],
  ["/modules", "syllabus"],
  [`/modules/${ids.module}`, "module"],
  [`/lessons/${ids.lesson}`, "lesson"],
  [`/projects/${ids.project}`, "project"],
];
for (const [path, name] of pages) {
  await go(path);
  await shot(`${name}.png`);
}
// Run the first runnable example on the lesson page
await go(`/lessons/${ids.lesson}`);
const ran = await ev(`(async () => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Run');
  if (!btn) return 'no runnable block';
  btn.scrollIntoView({ block: 'center' });
  btn.click();
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 500));
    const out = [...document.querySelectorAll('[aria-live=polite]')].find(e => /Output|Error/.test(e.textContent));
    if (out && !out.className.includes('opacity-55')) return out.textContent.slice(0, 200);
  }
  return 'timeout';
})()`);
console.log("run result:", ran);
await sleep(500);
const res = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(new URL("lesson-run.png", OUT), Buffer.from(res.result.data, "base64"));
await setup(1440, 900, "dark");
for (const [path, name] of [[`/lessons/${ids.lesson}`, "lesson"], ["/modules", "syllabus"]]) {
  await go(path);
  await shot(`${name}-dark.png`);
}
await setup(390, 844, "light");
for (const [path, name] of [[`/lessons/${ids.lesson}`, "lesson"], [`/modules/${ids.module}`, "module"]]) {
  await go(path);
  await shot(`${name}-mobile.png`);
}
console.log("console issues:", issues.length ? [...new Set(issues)] : "none");
ws.close();
chrome.kill();
process.exit(0);
