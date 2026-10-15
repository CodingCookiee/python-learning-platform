// Dev-only: the admin area for real in the browser, with a throwaway admin and learner (deleted at the end).
//   BASE=http://localhost:3000 node .impeccable/admin-e2e.mjs
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = new URL("./review/admin/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const shotPath = (name) => new URL(name, OUT).pathname.slice(1);
const stamp = Date.now();
const ADMIN = `e2e-admin-${stamp}@example.invalid`;
const LEARNER = `e2e-learner-${stamp}@example.invalid`;
const SIGNUP = `e2e-signup-${stamp}@example.invalid`;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const report = [];
const step = (name, data = {}) => {
  const r = { step: name, ...data };
  report.push(r);
  console.log(JSON.stringify(r));
};

const browser = await chromium.launch({ channel: "chrome" });
try {
  db("examiner", ADMIN);
  db("existing", LEARNER);
  db("capstone-submission", LEARNER);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(60_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(ADMIN);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 60_000 });

  // A new sign-up (through the real form's API) rings the bell
  const res = await page.request.post(`${BASE}/api/auth/register`, {
    data: { name: "Bell Tester", email: SIGNUP, password: "Correct-Horse-1", confirmPassword: "Correct-Horse-1" },
    headers: { "x-forwarded-for": `10.77.${stamp % 200}.1` },
  });
  step("sign-up", { status: res.status() });
  await page.goto(`${BASE}/admin`);
  const bell = page.getByRole("button", { name: /^Notifications/ });
  await bell.waitFor();
  step("bell", { label: await bell.getAttribute("aria-label") });
  await bell.click();
  await page.getByText("New sign-up: Bell Tester").waitFor({ timeout: 15_000 });
  await page.screenshot({ path: shotPath("bell.png") });
  await page.keyboard.press("Escape");

  // Overview
  await page.goto(`${BASE}/admin`);
  await page.getByRole("heading", { name: "The site" }).waitFor();
  await page.screenshot({ path: shotPath("overview.png"), fullPage: true });
  step("overview", { figures: await page.locator("section[aria-labelledby=site-heading] dt").allInnerTexts() });

  // Users: search
  await page.goto(`${BASE}/admin/users`);
  await page.getByLabel("Search users by name or email").fill(LEARNER.slice(0, 20));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL(/q=/);
  await page.screenshot({ path: shotPath("users.png"), fullPage: true });
  const rows = await page.locator("section[aria-labelledby=users-heading] li").count();
  step("users search", { rows });

  // The learner's record
  await page.locator("section[aria-labelledby=users-heading] li a").first().click();
  await page.getByRole("heading", { name: "Account actions" }).waitFor();
  await page.screenshot({ path: shotPath("record.png"), fullPage: true });

  // Grant module 1, then suspend with a reason
  await page.getByRole("button", { name: "Grant pass" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Grant pass" }).click();
  await page.getByText("Passed · granted").first().waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel(/Reason/).fill("browser test");
  await page.screenshot({ path: shotPath("suspend-dialog.png") });
  await dialog.getByRole("button", { name: "Suspend account" }).click();
  await page.getByText("Suspended because: browser test").waitFor({ timeout: 30_000 });
  step("record actions", { granted: true, suspended: true });

  // The suspended learner can't sign in
  const learnerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const lp = await learnerContext.newPage();
  await lp.goto(`${BASE}/auth/signin`);
  await lp.getByLabel("Email").fill(LEARNER);
  await lp.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await lp.getByRole("button", { name: "Sign in", exact: true }).click();
  const refused = await lp.getByRole("main").getByRole("alert").innerText({ timeout: 30_000 });
  step("suspended sign-in", { refused });
  await learnerContext.close();

  // Activity log
  await page.goto(`${BASE}/admin/activity`);
  await page.getByRole("heading", { name: "Activity" }).waitFor();
  step("activity", { firstRows: (await page.locator("section[aria-labelledby=log-heading] li").allInnerTexts()).slice(0, 2).map((t) => t.replace(/\s+/g, " ")) });
  await page.screenshot({ path: shotPath("activity.png") });

  // Notifications page
  await page.goto(`${BASE}/admin/notifications`);
  await page.getByRole("heading", { name: "Notifications", level: 1 }).waitFor();
  await page.screenshot({ path: shotPath("notifications.png") });

  // Phone: users list and record
  const phone = await browser.newContext({ ...devices["Pixel 7"], storageState: await context.storageState() });
  const pp = await phone.newPage();
  await pp.goto(`${BASE}/admin/users?q=${encodeURIComponent(LEARNER.slice(0, 20))}`);
  await pp.getByRole("heading", { name: "Users", level: 1 }).waitFor();
  await pp.screenshot({ path: shotPath("users-phone.png"), fullPage: true });
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await pp.locator("section[aria-labelledby=users-heading] li a").first().click();
  await pp.getByRole("heading", { name: "Account actions" }).waitFor();
  await pp.screenshot({ path: shotPath("record-phone.png"), fullPage: true });
  const overflowRecord = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  step("phone", { overflow, overflowRecord });
  await phone.close();
  step("errors", { errors });
} catch (e) {
  step("crashed", { error: String(e?.stack ?? e).slice(0, 800) });
} finally {
  step("cleanup", { result: db("cleanup", ADMIN, LEARNER, SIGNUP) });
  await browser.close();
}
