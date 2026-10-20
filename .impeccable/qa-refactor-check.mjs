// Dev-only: the three pages that used to call their own API over HTTP now read it directly
// (2026-10-19): the profile, a capstone page with a pending hand-in, and the examiner's queue.
//   BASE=http://localhost:3010 node .impeccable/qa-refactor-check.mjs
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3010";
const stamp = Date.now();
const LEARNER = `e2e-qarf-${stamp}@example.invalid`;
const EXAMINER = `e2e-qarfx-${stamp}@example.invalid`;
const db = (...a) => execSync(`npx tsx .impeccable/quest-e2e-db.ts ${a.join(" ")}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").pop();
const log = (o) => console.log(JSON.stringify(o));

async function signIn(page, email) {
  await page.goto(`${BASE}/auth/signin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("E2e-Quest-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
}
async function timed(page, path) {
  const t = Date.now();
  const res = await page.goto(`${BASE}${path}`);
  await page.getByRole("heading", { level: 1 }).waitFor();
  return { status: res?.status(), ms: Date.now() - t };
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  db("tour", LEARNER);
  db("examiner", EXAMINER);
  const submission = db("capstone-submission", LEARNER);
  const projectId = db("submission-project", submission);
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  const errors = [];
  page.on("response", (r) => r.status() >= 500 && errors.push(`${r.status()} ${new URL(r.url()).pathname}`));

  await signIn(page, LEARNER);
  for (let i = 0; i < 2; i++) {
    const t = await timed(page, "/profile");
    const headings = await page.getByRole("heading", { level: 2 }).allInnerTexts();
    log({ page: "profile", run: i + 1, ...t, record: headings.includes("Training record"), rank: (await page.getByText(/kyu/).first().innerText()).slice(0, 20) });
  }
  const p = await timed(page, `/projects/${projectId}`);
  const body = await page.locator("main").innerText();
  log({ page: "capstone", ...p, title: (await page.getByRole("heading", { level: 1 }).innerText()).slice(0, 50), showsPending: /pending|waiting|review/i.test(body) });

  await context.clearCookies();
  await signIn(page, EXAMINER);
  const q = await timed(page, "/admin/projects");
  const queue = await page.locator("main").innerText();
  log({ page: "examiner queue", ...q, listsTheHandIn: queue.includes("Tour Learner") || queue.includes(LEARNER.split("@")[0]) });
  log({ serverErrors: errors });
} catch (e) {
  log({ error: String(e?.stack ?? e).slice(0, 600) });
} finally {
  log({ cleanup: db("cleanup", LEARNER, EXAMINER) });
  await browser.close();
}
