// Dev-only: every auth page on a laptop screen (light, and sign-up dark), and sign-up on a phone.
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3010";
const OUT = process.env.OUT ?? ".impeccable/review/verify/";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const pages = ["signin", "signup", "forgot-password", "reset-password?token=preview-only-token", "verify-email?token=preview-only-token"];
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, colorScheme: scheme });
    for (const p of scheme === "dark" ? ["signup"] : pages) {
      await page.goto(`${BASE}/auth/${p}`);
      await page.waitForTimeout(700);
      const name = p.split("?")[0];
      const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);
      console.log(JSON.stringify({ page: name, scheme, scrolls }));
      await page.screenshot({ path: `${OUT}auth-${name}-${scheme}.png` });
    }
    await page.close();
  }
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await phone.goto(`${BASE}/auth/signup`);
  await phone.screenshot({ path: `${OUT}auth-signup-phone.png`, fullPage: true });
} finally {
  await browser.close();
}
