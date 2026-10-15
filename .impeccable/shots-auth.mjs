// Dev-only: screenshots of the email-confirmation flow and sign-in, desktop and phone.
//   BASE=http://localhost:3000 node .impeccable/shots-auth.mjs
import { mkdirSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = new URL("./review/auth/", import.meta.url);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });

for (const [name, opts] of [
  ["desktop", { viewport: { width: 1440, height: 900 } }],
  ["phone", devices["Pixel 7"]],
]) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && console.log(name, page.url(), "console:", m.text().slice(-1400)));
  page.on("pageerror", (e) => console.log(name, "pageerror:", e.message.slice(0, 300)));
  // The confirmation is answered here, so no real token is needed
  await page.route("**/api/auth/verify", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  await page.goto(`${BASE}/auth/verify-email?token=example`);
  await page.screenshot({ path: new URL(`verify-${name}.png`, OUT).pathname.slice(1) });
  await page.getByRole("button", { name: "Confirm my email" }).click();
  await page.getByRole("heading", { name: "You're all set." }).waitFor();
  await page.waitForTimeout(900);
  await page.screenshot({ path: new URL(`verified-${name}.png`, OUT).pathname.slice(1) });
  await page.goto(`${BASE}/auth/signin?verified=1`);
  await page.getByLabel("Email").waitFor();
  await page.screenshot({ path: new URL(`signin-verified-${name}.png`, OUT).pathname.slice(1) });
  await context.close();
}
await browser.close();
console.log("done");
