// Dev-only: the tape-fall celebration mid-flight on a drill pass, and the delete dialog's block option.
//   BASE=http://localhost:3010 OUT=<dir> node .impeccable/verify-celebrate.mjs
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/verify/";
const stamp = Date.now();
const LEARNER = `e2e-cel-${stamp}@example.invalid`;
const EXAMINER = `e2e-celx-${stamp}@example.invalid`;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const log = (o) => console.log(JSON.stringify(o));

async function signIn(page, email) {
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/);
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  db("tour", LEARNER);
  db("examiner", EXAMINER);
  const drillId = db("drill-id", "hello-pylearn");
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  await signIn(page, LEARNER);
  await page.goto(`${BASE}/exercises/${drillId}`);
  const solution = JSON.parse(db("drill", drillId)).solution;
  await page.waitForFunction(() => !!window.monaco?.editor?.getEditors?.().length);
  await page.evaluate((code) => {
    const ed = window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly));
    ed.setValue(code);
  }, solution);
  await page.locator("[data-quest-target=run-tests]").click();
  // The burst starts once the save adds XP
  await page.locator("canvas[aria-hidden=true]").first().waitFor({ state: "attached" });
  await page.getByText(/· \+\d+ XP/).first().waitFor();
  for (const ms of [250, 450]) {
    await page.waitForTimeout(ms);
    await page.screenshot({ path: `${OUT}tape-${ms}.png` });
  }

  // The delete dialog, as a super admin
  await context.clearCookies();
  await signIn(page, EXAMINER);
  await page.goto(`${BASE}/admin/users?q=${encodeURIComponent(LEARNER)}`);
  await page.locator(`main a[href^="/admin/users/"]`).filter({ hasText: LEARNER }).first().click();
  await page.waitForURL(/\/admin\/users\/[^?]+$/);
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByRole("alertdialog").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}delete-dialog.png` });
  log({ checked: await page.getByLabel("Don't let this address sign up again").isChecked() });
} catch (e) {
  log({ error: String(e?.stack ?? e).slice(0, 800) });
} finally {
  log({ cleanup: db("cleanup", LEARNER, EXAMINER) });
  await browser.close();
}
