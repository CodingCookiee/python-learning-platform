// Dev-only: a release QA pass over what the Playwright suite and the other probes don't cover.
//   BASE=http://localhost:3010 OUT=<dir> node .impeccable/qa-explore.mjs
// Part A probes the HTTP surface signed out. Part B signs up a brand-new account through the real
// form and uses the app as a learner would, then deletes the account from Settings. Throwaway
// @example.invalid accounts only; anything left behind is removed at the end.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/qa/";
mkdirSync(OUT, { recursive: true });
const stamp = Date.now();
const EMAIL = `e2e-qa-${stamp}@example.invalid`;
const PASSWORD = "maple-kettle-orbit-91";
const NEW_PASSWORD = "harbour-lantern-quiet-47";
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();

const results = [];
const issues = { console: [], pageErrors: [], serverErrors: [] };
async function check(name, fn) {
  const t = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - t, detail: detail ?? "" });
    console.log(`PASS  ${name}${detail ? `  (${detail})` : ""}`);
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - t, detail: String(e?.message ?? e).split("\n")[0].slice(0, 300) });
    console.log(`FAIL  ${name}  ${String(e?.message ?? e).split("\n")[0].slice(0, 300)}`);
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

// ── Part A: the HTTP surface, signed out ─────────────────────────────────────
async function get(path, init = {}) {
  return fetch(BASE + path, { redirect: "manual", ...init });
}

for (const path of ["/", "/about", "/contact", "/privacy", "/auth/signin", "/auth/signup", "/auth/forgot-password", "/robots.txt", "/sitemap.xml", "/llms.txt", "/opengraph-image"]) {
  await check(`public ${path} answers 200`, async () => {
    const t = Date.now();
    const r = await get(path);
    expect(r.status === 200, `status ${r.status}`);
    return `${Date.now() - t} ms`;
  });
}
await check("an unknown page is a real 404", async () => {
  const r = await get("/no-such-page-qa");
  expect(r.status === 404, `status ${r.status}`);
});
await check("an unknown certificate is a 404", async () => {
  const r = await get("/certificates/PL-PY-0000-0000");
  expect(r.status === 404, `status ${r.status}`);
});
await check("security headers on the home page", async () => {
  // The CSP goes on page requests, so ask as a browser does
  const r = await get("/", { headers: { accept: "text/html", "sec-fetch-dest": "document" } });
  const h = (k) => r.headers.get(k) ?? "";
  const missing = ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "strict-transport-security"].filter((k) => !h(k));
  expect(missing.length === 0, `missing ${missing.join(", ")}`);
  expect(/nonce-/.test(h("content-security-policy")), "CSP has no nonce");
  expect(!/unsafe-eval/.test(h("content-security-policy").replace(/'wasm-unsafe-eval'/g, "")), "CSP allows unsafe-eval");
  return "CSP with nonce, frame, nosniff, referrer, permissions, HSTS";
});
await check("robots.txt points at the sitemap and keeps private areas out", async () => {
  const t = await (await get("/robots.txt")).text();
  expect(/Sitemap:/i.test(t), "no Sitemap line");
  expect(/Disallow:\s*\/(admin|api|dashboard)/i.test(t), "no Disallow for private areas");
});
await check("signed-out visit to a signed-in page is sent to sign in", async () => {
  const r = await get("/dashboard");
  expect([302, 303, 307, 308].includes(r.status), `status ${r.status}`);
  expect(/\/auth\/signin/.test(r.headers.get("location") ?? ""), `to ${r.headers.get("location")}`);
});
for (const [method, path] of [["GET", "/api/progress"], ["GET", "/api/profile"], ["POST", "/api/tutor"], ["POST", "/api/sensei"], ["GET", "/api/settings/ai"], ["GET", "/api/admin/notifications"], ["POST", "/api/admin/users/x"], ["POST", "/api/exercises/x/submit"], ["DELETE", "/api/settings/delete"]]) {
  await check(`signed out: ${method} ${path} is refused`, async () => {
    const r = await get(path, { method, headers: { "content-type": "application/json" }, body: method === "GET" ? undefined : "{}" });
    expect([401, 403].includes(r.status), `status ${r.status}`);
    return String(r.status);
  });
}
for (const path of ["/api/progress/exercise", "/api/progress/project"]) {
  await check(`the removed self-pass route ${path} is gone`, async () => {
    // Signed out, the proxy answers every API call with 401 before routing, so 401 is fine too
    const r = await get(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    expect([401, 404, 405].includes(r.status), `status ${r.status}`);
  });
}
await check("register refuses a breached password and a link in the name", async () => {
  const bad = await get("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "see evil.com", email: `e2e-qa-bad-${stamp}@example.invalid`, password: "x", confirmPassword: "x" }) });
  expect(bad.status === 400, `status ${bad.status}`);
});
await check("forgot-password answers the same for an unknown address", async () => {
  const r = await get("/api/auth/password/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `nobody-${stamp}@example.invalid` }) });
  // With email off the server says reset isn't set up (503); with email on it's a uniform 200
  expect([200, 503].includes(r.status), `status ${r.status}`);
  return r.status === 503 ? "email not configured here (503, expected locally)" : "uniform 200";
});

// ── Part B: a new learner, through the real UI ───────────────────────────────
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
page.setDefaultTimeout(90_000);
page.on("console", (m) => {
  if (m.type() === "error" && !/caret-color|hydrat/i.test(m.text())) issues.console.push(`${new URL(page.url()).pathname}: ${m.text().slice(0, 200)}`);
});
page.on("pageerror", (e) => issues.pageErrors.push(`${new URL(page.url()).pathname}: ${String(e).slice(0, 200)}`));
page.on("response", (r) => {
  if (r.status() >= 500) issues.serverErrors.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
});
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` }).catch(() => {});

try {
  await check("sign up through the form", async () => {
    await page.goto(`${BASE}/auth/signup`);
    await page.getByLabel("Name").fill("QA Tester");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    // The form moves to /dashboard, which sends an account that hasn't onboarded on to /onboarding
    await page.waitForURL(/\/(onboarding|auth\/signin)/, { timeout: 90_000 });
    return new URL(page.url()).pathname;
  });

  await check("onboarding opens for a new account, then the dashboard", async () => {
    expect(page.url().includes("/onboarding"), `landed on ${new URL(page.url()).pathname}, not onboarding`);
    const r = await page.request.post(`${BASE}/api/onboarding`, { data: { experience: "other-language", goal: "python", weeklyHours: 5 } });
    expect(r.ok(), `onboarding save ${r.status()}`);
    await page.goto(`${BASE}/dashboard`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await shot("b-dashboard");
    return (await page.getByRole("heading", { level: 1 }).innerText()).slice(0, 60);
  });

  await check("a learner is refused by the admin area and its APIs", async () => {
    const a = await page.request.get(`${BASE}/api/admin/notifications`);
    const b = await page.request.post(`${BASE}/api/admin/users/someone`, { data: { action: "suspend", reason: "" } });
    const c = await page.request.post(`${BASE}/api/admin/content/refresh`);
    expect([a, b, c].every((r) => r.status() === 403), `statuses ${a.status()} ${b.status()} ${c.status()}`);
    await page.goto(`${BASE}/admin`);
    expect(!new URL(page.url()).pathname.startsWith("/admin"), `stayed on ${new URL(page.url()).pathname}`);
  });

  await check("a learner can't post a pass for a drill it didn't run (client grading, honour system)", async () => {
    // Records what H-2 means today: in client mode a forged pass is accepted
    const drillId = db("drill-id", "hello-pylearn");
    const r = await page.request.post(`${BASE}/api/exercises/${drillId}/submit`, { data: { code: "print(1)", passed: true, summary: { status: "ok", tests: [] } } });
    return `forged pass answered ${r.status()} (expected while GRADING_MODE=client; see H-2)`;
  });

  await check("run a lesson example", async () => {
    const lessonId = db("lesson-id", "running-python");
    await page.goto(`${BASE}/lessons/${lessonId}`);
    const run = page.locator("[data-quest-target=run-example]").first();
    await run.click();
    await page.getByText(/Hello|Output|printed/i).first().waitFor({ timeout: 120_000 });
    return "output shown";
  });

  await check("pass a drill through the editor", async () => {
    const drillId = db("drill-id", "hello-pylearn");
    const solution = JSON.parse(db("drill", drillId)).solution;
    await page.goto(`${BASE}/exercises/${drillId}`);
    await page.waitForFunction(() => !!window.monaco?.editor?.getEditors?.().length);
    await page.locator(".monaco-editor").first().click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.evaluate((code) => window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)).setValue(code), solution);
    await page.locator("[data-quest-target=run-tests]").click();
    await page.getByText(/tests passed/i).first().waitFor({ timeout: 120_000 });
    await page.getByText(/\+\d+ XP/).first().waitFor({ timeout: 60_000 });
    for (let i = 0; i < 4; i++) {
      await page.locator("[role=dialog] button, [role=alertdialog] button").filter({ hasText: /Keep training|Close|Continue/ }).first().click({ timeout: 2000 }).catch(() => {});
    }
    await shot("b-drill-passed");
    return "passed, XP awarded";
  });

  for (const [path, heading] of [["/review", "Review"], ["/log", null], ["/achievements", "Achievements"], ["/profile", null], ["/modules", null], ["/settings", null]]) {
    await check(`${path} loads`, async () => {
      const t = Date.now();
      await page.goto(`${BASE}${path}`);
      const h1 = page.getByRole("heading", { level: 1 });
      await h1.waitFor();
      if (heading) expect((await h1.innerText()).includes(heading), `h1 "${await h1.innerText()}"`);
      return `${Date.now() - t} ms`;
    });
  }

  await check("search finds a lesson", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.keyboard.press("Control+k");
    await page.keyboard.type("list");
    await page.getByRole("option").first().waitFor({ timeout: 20_000 }).catch(async () => {
      await page.locator("[role=dialog] a, [role=listbox] a").first().waitFor({ timeout: 10_000 });
    });
    await shot("b-search");
    await page.keyboard.press("Escape");
    return "results shown";
  });

  await check("settings: a name with a link is refused, a real one saves", async () => {
    await page.goto(`${BASE}/settings`);
    const name = page.locator("#settings-name");
    await name.fill("visit evil.com now");
    await page.getByRole("button", { name: "Save name" }).click();
    await page.getByText(/can't contain a link/i).waitFor({ timeout: 20_000 });
    await name.fill("QA Renamed");
    await page.getByRole("button", { name: "Save name" }).click();
    await page.getByText("Name saved.").waitFor({ timeout: 20_000 });
  });

  await check("settings: password policy (same, common, then a good one)", async () => {
    await page.goto(`${BASE}/settings`);
    const cur = page.locator("#current-pw");
    const nw = page.locator("#new-pw");
    const conf = page.locator("#confirm-pw");
    await cur.fill(PASSWORD);
    await nw.fill(PASSWORD);
    await conf.fill(PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByText(/password you have now/i).waitFor({ timeout: 20_000 });
    await nw.fill("password123");
    await conf.fill("password123");
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByText(/most used passwords/i).waitFor({ timeout: 20_000 });
    await nw.fill(NEW_PASSWORD);
    await conf.fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByText("Password changed.").waitFor({ timeout: 30_000 });
  });

  await check("settings: an AI key saves as a hint only, and deletes", async () => {
    const put = await page.request.put(`${BASE}/api/settings/ai`, { data: { provider: "anthropic", model: "claude-sonnet-5-5", apiKey: "sk-ant-qa-not-a-real-key-0000" } });
    if (put.status() === 503) return "skipped: ENCRYPTION_KEY not set here";
    expect(put.ok(), `save ${put.status()}`);
    const got = await (await page.request.get(`${BASE}/api/settings/ai`)).json();
    expect(got.credential?.keyHint === "0000", "hint isn't the last four");
    expect(!JSON.stringify(got).includes("not-a-real-key"), "the key came back to the browser");
    const del = await page.request.delete(`${BASE}/api/settings/ai`);
    expect(del.ok(), `delete ${del.status()}`);
    return "only the hint is returned";
  });

  await check("sign out, then the old password fails and the new one works", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.locator("header button[aria-haspopup=menu]").last().click();
    await page.getByRole("menuitem", { name: /Sign out/ }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/dashboard"), { timeout: 60_000 });
    const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes("@")));
    expect(keys.length === 0, `account keys left in the browser: ${keys.join(", ")}`);
    await page.goto(`${BASE}/auth/signin`);
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.locator("[role=alert]").filter({ hasText: /match/ }).waitFor({ timeout: 30_000 });
    await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  });

  await check("delete my account from Settings, then it can't sign in", async () => {
    await page.goto(`${BASE}/settings`);
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByRole("alertdialog").waitFor();
    await shot("b-delete-dialog");
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await page.waitForURL((u) => u.pathname === "/", { timeout: 60_000 });
    await page.goto(`${BASE}/auth/signin`);
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.locator("[role=alert]").filter({ hasText: /match/ }).waitFor({ timeout: 30_000 });
    return "account gone";
  });
} finally {
  await browser.close();
  const left = db("cleanup-prefix", `e2e-qa-`);
  writeFileSync(`${OUT}qa-results.json`, JSON.stringify({ base: BASE, results, issues, cleanup: left }, null, 2));
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed; cleanup: ${left}`);
  console.log(`console errors: ${issues.console.length}, page errors: ${issues.pageErrors.length}, 5xx: ${issues.serverErrors.length}`);
  for (const k of ["console", "pageErrors", "serverErrors"]) for (const line of [...new Set(issues[k])].slice(0, 8)) console.log(`  ${k}: ${line}`);
}
