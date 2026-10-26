# Deployment

How pylearn deploys and runs in production. The launch checklist, with every environment variable, is in [docs/WHATS-LEFT.md](docs/WHATS-LEFT.md) §1–§3. This file explains the mechanics behind it.

## Contents

- [The stack in production](#the-stack-in-production)
- [What a deploy does](#what-a-deploy-does)
- [Settings that matter](#settings-that-matter)
- [Content](#content)
- [The startup check](#the-startup-check)
- [Troubleshooting](#troubleshooting)

## The stack in production

- **Vercel** runs the Next.js app. Functions are pinned to `iad1` (US East) in `vercel.json`.
- **Neon Postgres** is the database. Create the production database in **AWS us-east-1**, next to the functions: every page makes several queries, and each one crosses the distance between the two.
- **Upstash Redis** holds the rate-limit counters and caches, shared by every function instance.
- **Resend** (or Gmail SMTP) sends the verification and password-reset emails.
- **Learners' browsers** run Python (Pyodide) and grade drills: `GRADING_MODE=client`.
- **Model providers** (Anthropic, OpenAI, Google) are called on each learner's own key. The platform holds no AI key.

## What a deploy does

`vercel.json` sets the build command:

```
prisma generate
  && (production only: tsx scripts/check-production-env.ts && prisma migrate deploy)
  && npm run build
```

- **Every production deploy applies pending migrations** to the database in `DATABASE_URL`, using `DIRECT_URL`, before building. Both must be set in the build environment. Running `npx prisma migrate deploy` by hand is only needed to migrate without a deploy.
- **Preview deploys never migrate.** The step runs only when `VERCEL_ENV` is `production`, so a branch with an unmerged migration can't change the production schema. A preview still needs a database to build: connect Neon's Vercel integration (a database branch per preview), or turn previews off. Never give Preview the production `DATABASE_URL`.
- **An unsafe setting stops the deploy** before the database is touched (see [the startup check](#the-startup-check)).

`AUTH_URL` must be set at **build time** too: `robots.txt`, the sitemap, certificate links and share cards are built with it.

`npm run build` runs `scripts/check-malware-signatures.mjs` first, then `next build`. API responses get `Cache-Control: private, no-store` (`vercel.json`), and every page gets security headers (`next.config.ts`) and a per-request Content-Security-Policy (`proxy.ts`).

## Settings that matter

- **Keep Fluid compute on.** It's Vercel's default for new projects. The AI routes declare `maxDuration` (tutor and Sensei 120 s, capstone reviews 240 s), which needs it; without it, functions stop after 10–15 seconds and most AI replies would fail.
- **`GRADING_MODE=client`.** Server grading runs learner code inside the web server, where it could read the secrets (security report C-2). Production refuses to start with `server`. Safe server grading comes with the execution sandbox in v2 (docs/ARCHITECTURE.md §17, M9).
- **`ENCRYPTION_KEY`** encrypts learners' AI keys. Rotating it makes saved keys unreadable, so learners paste them again. If production reuses the dev database, it needs the dev key.
- **`ADMIN_BOOTSTRAP_EMAIL`:** the first verified sign-in with this address becomes the super admin, and only while no admin exists. Sign in with it straight after the first deploy.

## Content

The course lives in `content/` as files and is copied into the database by a script, not by the build:

```bash
npm run content:validate   # every drill's solution passes and every starter fails
npm run content:sync       # copy content/ into the database (safe to re-run; never deletes progress)
```

Run `content:sync` against production after the first deploy, and again whenever `content/` changes. Then press **Refresh public pages** in Admin › Content, so the landing and About pages show the new numbers straight away.

## The startup check

`productionProblems()` (`lib/env.ts`) runs twice:

- **In the production build** (`scripts/check-production-env.ts`, from `vercel.json`). `GRADING_MODE=server` **fails the build**, so the site stays on the last good deploy. Next.js skips instrumentation during `next build`, which is why this step exists.
- **When a server instance starts** (`instrumentation.ts`). It throws on the same unsafe setting, which only matters if one were changed without a new build.

Both log `[pylearn] Missing production setting: …` for each missing launch setting: Upstash, email, `ENCRYPTION_KEY`, `CONTACT_EMAIL`, `ADMIN_BOOTSTRAP_EMAIL`. Check the build log and the function logs for these lines.

## Troubleshooting

- **The build stops with "Unsafe production settings":** set what it names (today, only `GRADING_MODE`, which must be `client`).
- **The build fails at `prisma migrate deploy`:** `DIRECT_URL` is missing or wrong in the build environment, or a migration conflicts with the database. Run `npx prisma migrate status` against it.
- **"Invalid environment variables" at startup:** `lib/env.ts` names each one. `AUTH_SECRET` needs at least 32 characters.
- **Sign-ups are verified instantly, and password reset says email isn't set up:** no email provider is configured.
- **Rate limits barely hold:** the Upstash variables aren't set, so each instance counts on its own. The startup log says so.
- **AI replies time out in production but work locally:** Fluid compute is off, or the plan caps function duration below the routes' `maxDuration`.
- **The landing page shows old numbers after a content change:** press **Refresh public pages** in Admin › Content.
- **Learners lost their saved AI keys:** `ENCRYPTION_KEY` changed.
