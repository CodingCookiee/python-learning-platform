// Dev-only: what the search shows after Ctrl+K and a query, and what /api/search answers.
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/";
const EMAIL = `e2e-qasr-${Date.now()}@example.invalid`;
const db = (...a) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${a.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const browser = await chromium.launch({ channel: "chrome" });
try {
  db("tour", EMAIL);
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.setDefaultTimeout(60_000);
  page.on("response", (r) => r.url().includes("/api/search") && console.log("api/search", r.status(), new URL(r.url()).search));
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/dashboard/);
  await page.getByRole("heading", { level: 1 }).waitFor();
  // Type straight after the shortcut, as a fast typist would, and see what arrives
  const t0 = Date.now();
  await page.keyboard.press("Control+k");
  await page.keyboard.type("list", { delay: 40 });
  await page.waitForTimeout(500);
  console.log("typed immediately, input holds:", JSON.stringify(await page.locator("input[aria-label='Search query']").inputValue().catch(() => "(no input)")), "after", Date.now() - t0, "ms");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(800);
  console.log("focused:", await page.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.getAttribute("placeholder") ?? ""}`));
  await page.keyboard.type("list");
  await page.waitForTimeout(4000);
  console.log("roles:", await page.evaluate(() => [...document.querySelectorAll("[role=option],[role=listbox],[role=dialog],[role=combobox]")].map((e) => `${e.getAttribute("role")}:${(e.textContent ?? "").trim().slice(0, 40)}`).slice(0, 8)));
  const r = await page.request.get(`${BASE}/api/search?q=list`);
  console.log("direct api:", r.status(), (await r.text()).slice(0, 200));
  await page.screenshot({ path: `${OUT}search-debug.png` });
} finally {
  db("cleanup", EMAIL);
  await browser.close();
}
