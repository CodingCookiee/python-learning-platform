// Dev-only: sign-up and sign-in fit a laptop screen without scrolling, and messages never move the form.
//   BASE=http://localhost:3010 OUT=<dir> node .impeccable/verify-auth-fit.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/verify/";
const log = (o) => console.log(JSON.stringify(o));
const browser = await chromium.launch({ channel: "chrome" });
const measure = (page) =>
  page.evaluate(() => ({
    scrolls: document.documentElement.scrollHeight > window.innerHeight,
    overBy: document.documentElement.scrollHeight - window.innerHeight,
    headingTop: Math.round(document.querySelector("h1").getBoundingClientRect().top),
    buttonBottom: Math.round(document.querySelector("form button[type=submit]").getBoundingClientRect().bottom),
  }));
try {
  for (const [w, h] of [[1440, 900], [1366, 768], [1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`${BASE}/auth/signup`);
    const clean = await measure(page);
    // Leave every field wrong, one by one, as a learner tabbing through would
    await page.getByLabel("Name").fill("x");
    await page.getByLabel("Name").fill("");
    await page.getByLabel("Email").click();
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).click();
    await page.getByLabel("Password", { exact: true }).fill("password");
    await page.getByLabel("Confirm password").click();
    await page.getByLabel("Confirm password").fill("nope");
    await page.getByLabel("Name").click();
    await page.waitForTimeout(300);
    const errors = await measure(page);
    if (w === 1366) await page.screenshot({ path: `${OUT}signup-errors-${w}.png` });
    // A server refusal (a breached password the browser allows)
    await page.getByLabel("Name").fill("Pat Tester");
    await page.getByLabel("Email").fill(`fit-${Date.now()}@example.invalid`);
    await page.getByLabel("Password", { exact: true }).fill("correcthorsebatterystaple");
    await page.getByLabel("Confirm password").fill("correcthorsebatterystaple");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForFunction(() => /breach|Too many|already/.test(document.querySelector("form")?.innerText ?? ""), null, { timeout: 30000 }).catch(() => {});
    console.log(JSON.stringify({ refusal: (await page.locator("form").innerText()).split(/\n/).filter((l) => /breach|Too many|already|went wrong/i.test(l)) }));
    await page.waitForTimeout(300);
    const refused = await measure(page);
    if (w === 1366) await page.screenshot({ path: `${OUT}signup-refused-${w}.png` });
    await page.goto(`${BASE}/auth/signin`);
    const signin = await measure(page);
    log({ viewport: `${w}x${h}`, clean, errors, refused, signin });
    if (w === 1366) {
      await page.goto(`${BASE}/auth/signup`);
      await page.screenshot({ path: `${OUT}signup-clean-${w}.png` });
    }
    await page.close();
  }
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await phone.goto(`${BASE}/auth/signup`);
  await phone.screenshot({ path: `${OUT}signup-phone.png`, fullPage: true });
  log({ phone: await measure(phone) });
} catch (e) {
  log({ error: String(e?.stack ?? e).slice(0, 700) });
} finally {
  await browser.close();
}
