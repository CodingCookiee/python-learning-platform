// Dev-only: a signed-in account that hasn't onboarded is sent to /onboarding from the dashboard.
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3010";
const EMAIL = `e2e-qaon-${Date.now()}@example.invalid`;
const db = (...a) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${a.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const browser = await chromium.launch({ channel: "chrome" });
try {
  db("fresh", EMAIL);
  const page = await browser.newPage();
  page.setDefaultTimeout(90_000);
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 60_000 });
  console.log("PASS  an account that hasn't onboarded lands on", new URL(page.url()).pathname);
  await page.getByRole("heading", { level: 1 }).waitFor();
  console.log("      heading:", (await page.getByRole("heading", { level: 1 }).innerText()).slice(0, 60));
} catch (e) {
  console.log("FAIL ", String(e).split("\n")[0]);
} finally {
  db("cleanup", EMAIL);
  await browser.close();
}
