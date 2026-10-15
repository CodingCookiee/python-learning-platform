// Dev-only: the quest's first step in sync with the run. A fresh browser (Python not cached), Run
// pressed as soon as the button exists, before the sensei's panel has loaded the quest.
//   BASE=http://localhost:3000 node .impeccable/quest-sync-e2e.mjs
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = new URL("./review/quest-sync/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const EMAIL = `e2e-sync-${Date.now()}@example.invalid`;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const log = (o) => console.log(JSON.stringify(o));

const browser = await chromium.launch({ channel: "chrome" });
try {
  db("existing", EMAIL);
  const lessonId = db("lesson-id", "running-python");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  page.setDefaultNavigationTimeout(120_000);
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  log({ start: (await page.request.post(`${BASE}/api/quest/start`)).status() });

  page.on("response", async (r) => {
    if (r.url().includes("/api/quest/event")) log({ api: "POST /api/quest/event", status: r.status(), ms: Math.round(r.request().timing().responseEnd) });
  });
  page.on("requestfailed", (r) => r.url().includes("/api/quest") && log({ failed: r.url(), why: r.failure()?.errorText }));
  await page.goto(`${BASE}/lessons/${lessonId}`, { waitUntil: "commit" });
  const run = page.locator("[data-quest-target=run-example]").first();
  await run.waitFor();
  const panelLoaded = await page.locator("[data-quest-panel]").count();
  const pressed = Date.now();
  await run.click();
  log({ step: "pressed Run", panelLoadedAtPress: panelLoaded > 0 });

  // The filler while Python starts
  const filler = page.getByText(/Starting Python in your browser|Running the example/).first();
  const sawFiller = await filler.waitFor({ timeout: 15_000 }).then(() => true, () => false);
  if (sawFiller) await page.screenshot({ path: new URL("filler.png", OUT).pathname.slice(1) });
  log({ step: "filler", sawFiller, afterMs: Date.now() - pressed });

  // Output, then the sensei's next step: how far apart
  await page.locator("[data-quest-target=run-example]").first().locator("xpath=ancestor::div[contains(@class,'rounded-md')][1]").getByText(/./).first().waitFor();
  const outputAt = await page.waitForFunction(() => document.querySelector("[aria-busy=true][data-quest-target=run-example]") === null).then(() => Date.now());
  const advanced = await page.getByText("Try the scratchpad", { exact: false }).first().waitFor({ timeout: 30_000 }).then(() => Date.now(), () => null);
  await page.screenshot({ path: new URL("advanced.png", OUT).pathname.slice(1) });
  log({ step: "sync", runFinishedMs: outputAt - pressed, senseiAdvancedMs: advanced ? advanced - pressed : null, gapMs: advanced ? advanced - outputAt : null });

  // The server agrees (a reload still shows step 2)
  await page.waitForTimeout(3000);
  log({ serverSays: (await (await page.request.get(`${BASE}/api/quest`)).json()).quest?.completed, row: db("quest", EMAIL) });
  await page.waitForTimeout(5000);
  log({ rowLater: db("quest", EMAIL) });
  await page.reload();
  const kept = await page.getByText("step 2 of 5").first().waitFor({ timeout: 60_000 }).then(() => true, () => false);
  log({ step: "persisted", kept });
} catch (e) {
  log({ crashed: String(e?.stack ?? e).slice(0, 600) });
} finally {
  log({ cleanup: db("cleanup", EMAIL) });
  await browser.close();
}
