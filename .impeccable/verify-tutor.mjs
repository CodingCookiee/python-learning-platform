// Dev-only: the tutor's offer on a drill, light and dark.
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/verify/";
const A = `e2e-tut-${Date.now()}@example.invalid`;
const db = (...args) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${args.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const browser = await chromium.launch({ channel: "chrome" });
try {
  db("tour", A);
  const drillId = db("drill-id", "hello-pylearn");
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, colorScheme: scheme });
    const page = await context.newPage();
    page.setDefaultTimeout(90_000);
    await page.goto(`${BASE}/auth/signin`);
    await page.getByLabel("Email").fill(A);
    await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/dashboard/);
    await page.goto(`${BASE}/exercises/${drillId}`);
    const offer = page.getByText("Stuck? Ask the tutor.");
    await offer.waitFor();
    await offer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const box = await offer.locator("xpath=ancestor::div[1]").boundingBox();
    await page.screenshot({ path: `${OUT}tutor-${scheme}.png`, clip: { x: box.x - 20, y: box.y - 20, width: box.width + 40, height: box.height + 40 } });
    await context.close();
  }
} catch (e) {
  console.log(String(e?.stack ?? e).slice(0, 600));
} finally {
  db("cleanup", A);
  await browser.close();
}
