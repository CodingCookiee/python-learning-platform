// Dev-only: the premium pass's surfaces, captured: empty states, a skeleton mid-load, dialogs (plain
// and destructive), the account menu, a tooltip, and the drill's brand icons.
//   BASE=http://localhost:3010 OUT=<dir> node .impeccable/verify-premium.mjs
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/verify/";
const stamp = Date.now();
const LEARNER = `e2e-prem-${stamp}@example.invalid`;
const EXAMINER = `e2e-premx-${stamp}@example.invalid`;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const log = (o) => console.log(JSON.stringify(o));

async function signIn(page, email) {
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/);
}
const shot = (page, name, opts = {}) => page.screenshot({ path: `${OUT}${name}.png`, ...opts });

const browser = await chromium.launch({ channel: "chrome" });
try {
  db("tour", LEARNER);
  db("examiner", EXAMINER);
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  await signIn(page, LEARNER);
  await page.waitForTimeout(1500);

  // Empty states
  await page.goto(`${BASE}/review`);
  await page.getByText("Nothing to review yet").waitFor();
  await page.getByText("Nothing to review yet").scrollIntoViewIfNeeded();
  await shot(page, "p-review-empty");
  await page.goto(`${BASE}/profile#record-heading`);
  await page.getByText("Lessons you finish show up here.").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shot(page, "p-profile-empty");

  // A skeleton mid-load: client navigation with the page's data held back
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(1500);
  await page.route(/_rsc=/, async (route) => {
    await new Promise((r) => setTimeout(r, 5000));
    await route.continue().catch(() => {});
  });
  await page.locator('header a[href="/log"]').first().click();
  await page.waitForTimeout(1600);
  await shot(page, "p-skeleton");
  await page.unroute(/_rsc=/);
  await page.waitForURL(/\/log/);

  // The account menu
  await page.goto(`${BASE}/dashboard`);
  await page.locator("header button[aria-haspopup=menu]").last().click();
  await page.getByRole("menu").waitFor();
  await page.waitForTimeout(300);
  await shot(page, "p-menu", { clip: { x: 760, y: 0, width: 520, height: 420 } });
  await page.keyboard.press("Escape");

  // The quest's skip dialog
  await page.getByRole("button", { name: /Skip the quest/ }).first().click();
  await page.getByRole("alertdialog").waitFor();
  await page.waitForTimeout(400);
  await shot(page, "p-dialog");
  await page.getByRole("button", { name: "Cancel" }).click().catch(() => {});

  // A drill: hints and the tutor in the sensei's mark, and the Sensei's tooltip pointing to the tutor
  const drillId = db("drill-id", "hello-pylearn");
  await page.goto(`${BASE}/exercises/${drillId}`);
  await page.getByText("Hints").first().waitFor();
  await page.waitForTimeout(1500);
  await shot(page, "p-drill");
  const sensei = page.locator("[data-sensei-trigger], button[aria-label*='Sensei']").last();
  if (await sensei.count()) {
    await sensei.hover();
    await page.waitForTimeout(500);
    await shot(page, "p-tooltip", { clip: { x: 760, y: 560, width: 520, height: 300 } });
  }

  // Dark: the dialog again
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => { document.documentElement.classList.add("dark"); });
  await page.goto(`${BASE}/review`);
  await page.evaluate(() => { document.documentElement.classList.add("dark"); });
  await page.waitForTimeout(800);
  await shot(page, "p-review-empty-dark");

  // The examiner: a destructive confirmation
  await page.evaluate(() => { document.documentElement.classList.remove("dark"); });
  await context.clearCookies();
  await signIn(page, EXAMINER);
  await page.goto(`${BASE}/admin/users?q=${encodeURIComponent(LEARNER)}`);
  await page.locator(`main a[href^="/admin/users/"]`).filter({ hasText: LEARNER }).first().click();
  await page.waitForURL(/\/admin\/users\/[^?]+$/);
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByRole("alertdialog").waitFor();
  await page.waitForTimeout(400);
  await shot(page, "p-dialog-destructive");
} catch (e) {
  log({ error: String(e?.stack ?? e).slice(0, 900) });
} finally {
  log({ cleanup: db("cleanup", LEARNER, EXAMINER) });
  await browser.close();
}
