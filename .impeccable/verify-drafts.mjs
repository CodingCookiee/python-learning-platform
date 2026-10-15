// Dev-only: two accounts on one browser. A fixes the quest's bug drill without submitting (a local
// draft), signs out; B signs in on the same browser and must get the broken starter, not A's fix.
//   BASE=http://localhost:3010 node .impeccable/verify-drafts.mjs
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3010";
const stamp = Date.now();
const A = `e2e-dra-${stamp}@example.invalid`;
const B = `e2e-drb-${stamp}@example.invalid`;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const log = (o) => console.log(JSON.stringify(o));

async function signIn(page, email) {
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/dashboard/);
}
const editorText = (page) => page.evaluate(() => window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)).getValue());

const browser = await chromium.launch({ channel: "chrome" });
try {
  db("bug-step", A);
  db("bug-step", B);
  const drillId = db("drill-id", "fix-the-indentation");
  const solution = JSON.parse(db("drill", drillId)).solution;
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);

  await signIn(page, A);
  await page.goto(`${BASE}/exercises/${drillId}`);
  await page.waitForFunction(() => !!window.monaco?.editor?.getEditors?.().length);
  await page.evaluate((code) => {
    window.monaco.editor.getEditors().find((e) => !e.getOption(window.monaco.editor.EditorOption.readOnly)).setValue(code);
  }, solution);
  await page.locator(".monaco-editor textarea").first().focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("# mine");
  await page.waitForTimeout(1500);
  log({ aKeys: await page.evaluate(() => Object.keys(localStorage)), account: await page.evaluate(() => document.querySelector("[data-account]")?.getAttribute("data-account")) });
  // Sign out from the account menu
  await page.goto(`${BASE}/dashboard`);
  await page.locator("header button[aria-haspopup=menu]").last().click();
  await page.getByRole("menuitem", { name: /Sign out/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/dashboard"));
  log({ afterSignOut: await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("drill-"))) });

  await signIn(page, B);
  await page.goto(`${BASE}/exercises/${drillId}`);
  await page.waitForFunction(() => !!window.monaco?.editor?.getEditors?.().length);
  await page.waitForTimeout(1000);
  const bSees = await editorText(page);
  log({ bGetsStarter: bSees !== solution, bFirstLines: bSees.split("\n").slice(2, 5) });
  const card = page.locator("[data-quest-panel]").first();
  log({ sensei: (await card.innerText()).replace(/\s+/g, " ").slice(0, 140) });
} catch (e) {
  log({ error: String(e?.stack ?? e).slice(0, 800) });
} finally {
  log({ cleanup: db("cleanup", A, B) });
  await browser.close();
}
