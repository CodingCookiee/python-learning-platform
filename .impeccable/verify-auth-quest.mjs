// Dev-only: the password policy on the forms, and step 4 of the quest staged on its bug drill.
//   BASE=http://localhost:3010 OUT=<dir> node .impeccable/verify-auth-quest.mjs
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/verify/";
const stamp = Date.now();
const SIGNUP = `e2e-pw-${stamp}@example.invalid`;
const BUG = `e2e-bug-${stamp}@example.invalid`;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const log = (o) => console.log(JSON.stringify(o));

const browser = await chromium.launch({ channel: "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);

  // Sign-up: the rule up front, then a common password refused as the field is left
  await page.goto(`${BASE}/auth/signup`);
  await page.getByLabel("Name").fill("Pat Tester");
  await page.getByLabel("Email").fill(SIGNUP);
  log({ hint: await page.locator("#password-hint").textContent() });
  await page.getByLabel("Password", { exact: true }).fill("Password2026!");
  await page.getByLabel("Confirm password").click();
  log({ commonError: await page.locator("#password-error").textContent() });
  await page.getByRole("button", { name: "Show password", exact: true }).first().click();
  log({ shownType: await page.getByLabel("Password", { exact: true }).getAttribute("type") });
  await page.screenshot({ path: `${OUT}signup-policy.png` });

  // A password the local rules allow but a breach list has: refused by the server
  await page.getByLabel("Password", { exact: true }).fill("correcthorsebatterystaple");
  await page.getByLabel("Confirm password").fill("correcthorsebatterystaple");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.locator("[role=alert]").first().waitFor();
  log({ breachError: await page.locator("[role=alert]").first().textContent() });

  // Sign-in asks for a password, not its length
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill("nobody@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.locator("[role=alert]").first().waitFor();
  log({ signinShort: await page.locator("[role=alert]").first().textContent() });

  // Step 4: run it, read the error, fix it, run the tests
  db("bug-step", BUG);
  const drillId = db("drill-id", "fix-the-indentation");
  await context.clearCookies();
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(BUG);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  await page.goto(`${BASE}/exercises/${drillId}`);
  const card = page.locator("[data-quest-panel]").first();
  await card.waitFor();
  const say = async (label) => {
    await page.waitForTimeout(600);
    log({ [label]: (await card.innerText()).replace(/\s+/g, " ").slice(0, 260) });
  };
  await say("look");
  await page.screenshot({ path: `${OUT}bug-1-look.png` });
  await page.locator("[data-quest-target=run-code]").click();
  await page.locator("[data-quest-target=drill-output]").getByText(/IndentationError/).first().waitFor();
  await say("read");
  await page.screenshot({ path: `${OUT}bug-2-read.png` });

  // Running the tests on the broken code doesn't tick the step
  await page.locator("[data-quest-target=run-tests]").click();
  await page.waitForTimeout(6000);
  await say("retry");
  log({ afterFailedTests: JSON.parse(db("quest", BUG)).completed });

  // Fix it in the editor, then the tests
  const solution = JSON.parse(db("drill", drillId)).solution;
  await page.waitForFunction(() => !!window.monaco?.editor?.getEditors?.().length);
  await page.evaluate((code) => {
    const ed = window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly));
    ed.setValue(code);
  }, solution);
  await say("check");
  await page.screenshot({ path: `${OUT}bug-3-check.png` });
  await page.locator("[data-quest-target=run-tests]").click();
  await page.getByText(/All 3 tests passed|tests passed/).first().waitFor();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}bug-4-passed.png` });
  log({ afterPass: JSON.parse(db("quest", BUG)).completed });
} catch (e) {
  log({ error: String(e?.stack ?? e).slice(0, 800) });
} finally {
  log({ cleanup: db("cleanup", SIGNUP, BUG) });
  await browser.close();
}
