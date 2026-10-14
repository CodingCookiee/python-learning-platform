import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests: real journeys in a real browser against a production build.
 *
 *   npm run build && npm run test:e2e
 *
 * The suite starts `next start` on :3010 itself (or reuses one already running there). Every test
 * makes its own throwaway learner in the database from .env and deletes it afterwards, so the
 * remote dev database is slow but shared state is never assumed. Runs on the installed Chrome.
 */
const PORT = 3010;
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // One remote database behind every test: a couple at a time keeps it responsive
  workers: 2,
  // Seeding a learner and a first server render against the remote database take a while
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    channel: "chrome",
    // A failing test keeps its trace (DOM snapshots, network, console: `npx playwright show-trace`)
    // and a screenshot. No video: it needs a separate ffmpeg download
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" }, grepInvert: /@phone/ },
    { name: "phone", use: { ...devices["Pixel 7"], channel: "chrome" }, grep: /@phone/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    // No email sending in tests: sign-ups verify themselves and nothing leaves the machine
    env: { AUTH_URL: BASE_URL, GMAIL_USER: "", GMAIL_APP_PASSWORD: "", RESEND_API_KEY: "" },
  },
});
