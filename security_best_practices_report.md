# Security review: pylearn

Reviewed 2026-10-14 against the Next.js server, React frontend and general web frontend security guidance. Stack: Next.js 16.2.7 (App Router, Proxy), React 19.2, Auth.js v5 (JWT sessions in an HttpOnly cookie), Prisma 7 / Postgres, Pyodide (browser and Node worker threads), Upstash Redis.

## Status on 2026-10-26 (pre-launch review)

Every finding was re-checked against the code on 2026-10-19 (release QA) and again on 2026-10-26, when the pre-launch review fixed the rest it could and found the new items at the end of the table.

| ID | Status | How |
|---|---|---|
| C-1 | **Fixed** | Emails are normalised everywhere, and every lookup is now an **exact** match on the lower-cased address (2026-10-26: a case-insensitive match compiled to `ILIKE`, where `_` is a wildcard, so a reset link for `ann_lee@…` could reset `annxlee@…`). The bootstrap admin needs an exact address that was really proven (link-confirmed, or a verified Google or GitHub address), and only while no admin exists |
| C-2 | Open, contained | `GRADING_MODE` stays `client`. A production build with `server` **stops before deploying** (`scripts/check-production-env.ts`, from `vercel.json`), and a server refuses it at start (`instrumentation.ts`). The real fix is the execution sandbox (ARCHITECTURE.md §17, M9) |
| C-3 | Mostly fixed | `next` 16.3.8, `next-auth` 5.0.0-beta.32 (`@auth/core` 0.41.3), `@auth/prisma-adapter` 2.11.3, `nodemailer` 10.0.15 (Auth.js's optional nodemailer peer is pointed at it with an npm `overrides` entry), `zod` 4.6.7, `shadcn` in devDependencies. Two critical `next` advisories published since (fixed in 16.4.1): the image optimizer, now switched off (`images.unoptimized`; nothing uses `next/image`), and `use cache`, which the app doesn't use. Upgrade to 16.4.1+ after 2026-10-28 and make CI's audit blocking again |
| H-1 | **Fixed** | The legacy self-pass routes are deleted |
| H-2 | Accepted for v1 | Drill grading is honour-system while `GRADING_MODE=client`. Capstones stay examiner-approved, so certificates still need a person's sign-off |
| M-1 | Partly fixed | Sign-in is limited per email, and per IP on **failed** attempts only (so a classroom behind one address isn't locked out). The client IP comes from Vercel's `x-real-ip`. Production logs a missing-setting line when Upstash isn't set: set the Upstash variables before launch |
| M-2 | **Fixed** (2026-10-26) | `User.sessionVersion`: a session carries the version it signed in under, and a password change or reset raises it. `withAuth` and the navbar refuse older sessions; the settings page signs straight back in (`lib/session-version.ts`) |
| M-3 | **Fixed** | Google needs `email_verified`; a first GitHub sign-in checks GitHub's verified-email list (`githubEmailVerified` in `auth.config.ts`). A returning GitHub account isn't re-checked, so a learner whose old address left GitHub isn't locked out |
| M-4 | **Fixed** | The pages call their data functions directly; `lib/server-url.ts` is gone |
| M-5 | Open | HTTPS only, no redirects and an 8 s timeout limit it |
| L-1 | **Fixed** | AI replies render without raw HTML |
| L-3 | **Fixed** | Examiner downloads are always `application/octet-stream` with `Content-Security-Policy: sandbox` and a safe ASCII filename; the route uses `withAdmin`, so a **suspended admin can no longer download files** (found in this pass) |
| L-5 | **Fixed** | A one-time link is accepted only by the request that deletes it (test: two simultaneous uses, one succeeds) |
| L-4 | **Fixed** (2026-10-26) | Capstone uploads are measured from their content: 1 MB a file, 3 MB in all (under Vercel's 4.5 MB request limit) (`lib/capstone-upload.ts`) |
| L-2, L-6 to L-9 | Open, low | Unchanged |
| N-1 (2026-10-26) | **Fixed** | An examiner could approve their own capstone, unaudited, and a double click could award twice. Self-grading is refused, the decision is one transaction, and it's in the audit log |
| N-2 (2026-10-26) | **Fixed** | A deleted account's email stayed in the audit log and admin notices, against the Privacy page. Both are cleared on deletion (`lib/admin/forget-account.ts`) |
| N-3 (2026-10-26) | **Fixed** | The last super admin could delete their own account, re-arming the bootstrap address. Refused now |
| N-4 (2026-10-26) | **Fixed** | `GET /api/progress` sent the examiner's private AI draft and the uploaded files to the learner. It selects only what the profile shows |
| N-5 (2026-10-26) | **Fixed** | A refused Google or GitHub sign-in landed on a 404 (no `/auth/error` page) |
| Info: drafts in `localStorage` | **Fixed** | Browser storage is keyed to the account and cleared on sign-out (`lib/account-storage.ts`) |

## Executive summary

The app's foundations are sound:
- Per-request CSP nonces; global security headers.
- AES-256-GCM for stored AI keys.
- Hashed single-use email tokens.
- Database-checked admin access.
- Zod validation on almost every route.
- No raw HTML from users or AI reaching an admin's browser.

But four problems need fixing **before launch**:

1. **Anyone can make themselves admin** by registering a different-case copy of `ADMIN_BOOTSTRAP_EMAIL` (C-1).
2. **Server grading (`GRADING_MODE=server`) runs learner Python inside the web server with access to its secrets and Node APIs** (C-2). `docs/WHATS-LEFT.md` currently recommends switching it on for launch. **Do not, until C-2 is fixed.**
3. **Two forgotten legacy routes let any learner mark drills passed and capstones approved**, which feed the black belt and the Python certificate (H-1).
4. **`next`, `next-auth` and `nodemailer` have published critical/high advisories** (C-3).

| ID | Severity | Finding |
|---|---|---|
| C-1 | Critical | Bootstrap-admin takeover through email case variants |
| C-2 | Critical (server grading only) | Learner code escapes Pyodide into the Node server |
| C-3 | Critical | Known-vulnerable `next`, `next-auth`/`@auth/core`, `nodemailer` |
| H-1 | High | Legacy `/api/progress/exercise` and `/api/progress/project` allow self-pass and self-approval |
| H-2 | High | Browser-trusted grading by default; no safe production setting exists yet |
| M-1 | Medium | Rate limits fall back to per-instance memory; sign-in limited per email only |
| M-2 | Medium | Password change/reset doesn't end other sessions (30-day JWTs) |
| M-3 | Medium | OAuth sign-in trusts provider email without checking it's verified (bootstrap admin) |
| M-4 | Medium | Host-header-derived origin for server self-fetches (SSRF when self-hosted) |
| M-5 | Medium | Lab URL probe's private-address check can be bypassed |
| L-1 … L-9 | Low | See below |

---

## Critical

### C-1. Anyone can become admin by registering a case variant of the bootstrap email

- **Rule:** NEXT-AUTH-001
- **Impact:** An attacker who knows (or guesses) the admin's email gets full admin: they can approve capstones, read submissions, and view every learner's name and email.

**Evidence:**
- `app/api/auth/register/route.ts:18`: the duplicate check is an exact-case `prisma.user.findUnique({ where: { email } })`.
- `lib/validations/auth.ts:15`: `email: z.string().email(...)`. It is never lower-cased.
- `prisma/schema.prisma`: `email String @unique` is case-sensitive in Postgres.
- `app/api/auth/register/route.ts:36`: `emailVerified: isEmailConfigured() ? null : new Date()`. Without an email provider, a new account is verified immediately.
- `lib/env.ts:65`: `isBootstrapAdmin` compares lower-cased emails.
- `auth.config.ts:88`: `resolveRole` then writes `role: "ADMIN"` on the next sign-in.
- `app/api/auth/verify/route.ts:25`: verification uses `updateMany({ where: { email: { equals, mode: "insensitive" } } })`. Even with email configured, verifying one address therefore verifies every case variant, including an attacker's account that holds the attacker's password. This affects every user, not only the admin.

**Fix:**
1. Normalise emails (`trim().toLowerCase()`) in every schema and lookup (sign-up, sign-in, forgot, resend, OAuth).
2. Make uniqueness case-insensitive: a unique index on `lower(email)`, or `citext`.
3. Verify by exact identifier.
4. Only grant bootstrap admin to an account whose email was verified by a link or a verified OAuth email. Better still, replace auto-promotion with a one-off CLI or seed step.

### C-2. Learner code escapes Pyodide into the Node server when `GRADING_MODE=server`

- **Rule:** NEXT-INJECT-002 / NEXT-INJECT-003
- **Impact:** Any learner can read `DATABASE_URL`, `AUTH_SECRET` and `ENCRYPTION_KEY`, which means forging any session and decrypting everyone's AI keys. They can also run shell commands, read host files, make requests from the server, or kill it.

**Evidence:**
- `scripts/content/pyodide-thread.mjs:37-42`: `loadPyodide({ indexURL, packageCacheDir, stdout, stderr })` passes no `jsglobals`, so Python's `js` module is the worker's real `globalThis`.
- `scripts/content/pyodide-pool.mjs:41`: `new Worker(this.thread, { workerData })` passes no `env` or `resourceLimits`, so the worker shares the server's `process.env`.
- `lib/grading/server.ts:119`: the learner's `submitted` code runs unchanged.
- Example payloads:
  - `import js; js.process.env.AUTH_SECRET`;
  - `js.process.getBuiltinModule("child_process").execSync(...)`;
  - `js.fetch(...)`.
- Interpreter state also carries over between jobs: one thread runs up to 500 jobs and keeps `plp_runner` loaded. So one learner can monkeypatch the runner to pass or fail other learners, or collect their solutions.

**Fix:**
- Don't run learner code inside the web server process. Run grading in a separate sandbox with an empty environment, no network, and memory and CPU limits (a container or microVM).
- As an interim step:
  - use a child process (`spawn` with `env: {}`, `--max-old-space-size`, Node's `--permission` flag limited to Pyodide's directory);
  - `loadPyodide({ jsglobals: {} })`;
  - remove `js`, `pyodide_js`, `pyodide.ffi` and `pyodide.code` from `sys.modules` and block importing them;
  - start a fresh interpreter for every job;
  - cap concurrency and queue length.
- **Until then, keep `GRADING_MODE=client`** and correct `docs/WHATS-LEFT.md`.

### C-3. Dependencies with critical and high advisories

- **Rule:** NEXT-SUPPLY-001, REACT-SUPPLY-001

`npm audit --omit=dev` reports 35 advisories (5 critical, 21 high). The ones that matter at runtime:

| Package | Installed | Advisories | Fixed (oldest release ≥ 2 weeks old) |
|---|---|---|---|
| `next` | 16.2.7 (`package.json:43`) | Proxy bypass (Turbopack); Server Actions DoS (GHSA-6gpp-xcg3-4w24, GHSA-m99w-x7hq-7vfj) | 16.3.8 (2026-09-30) |
| `next-auth` / `@auth/core` | 5.0.0-beta.31 / 0.41.2 (`package.json:44`) | Config errors fail open; email homoglyph bypass; `getToken` crash (GHSA-8fpg-xm3f-6cx3, GHSA-7rqj-j65f-68wh, GHSA-xmf8-cvqr-rfgj) | 5.0.0-beta.32 + `@auth/prisma-adapter` 2.11.3 (2026-07-20) |
| `nodemailer` | 7.0.13 (`package.json:46`) | SMTP command injection (GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g) | 10.x major; check the 10.0.x line for a release ≥ 2 weeks old |
| `shadcn` | 4.10.0 (`package.json:55`, in `dependencies`) | Brings in vulnerable tooling (braces, micromatch, ts-morph) | It's a CLI: move it to `devDependencies` |

The `prisma`-linked advisories (`mysql2`, `deepmerge-ts`, `@prisma/config`) are in CLI tooling, not the runtime query path. Track them and upgrade Prisma when a fixed 7.x ships.

**Fix:** upgrade to exact patched versions, run the full test suite (unit, integration, e2e), and add `npm audit --omit=dev --audit-level=high` to CI.

---

## High

### H-1. Legacy progress routes let a learner self-pass drills and self-approve capstones

- **Rule:** NEXT-AUTH-001 (authorization by role/action)
- **Impact:** Any signed-in learner can earn the black belt and the Python certificate, plus unlimited XP and achievements, without passing anything.

**Evidence:**
- `app/api/progress/exercise/route.ts:12`: `passed: z.boolean()` is taken from the client, stored, and awards XP (`:70`). This bypasses even `GRADING_MODE=server`.
- `app/api/progress/project/route.ts:58`: it sets `status: "approved"` straight away, with no examiner, and `:66` adds `project.xpReward` on every call, with no de-duplication or rate limit.
- `lib/black-belt.ts` and `lib/certificates.ts` count those approvals.
- Nothing in the app calls either route.

**Fix:** delete both routes.

### H-2. Grading trusts the browser by default

- **Rule:** NEXT-AUTH-001
- **Evidence:**
  - `lib/env.ts:34`: `GRADING_MODE ... .default("client")`.
  - `app/api/exercises/[id]/submit/route.ts:64`: the client's `passed` is kept unless server grading is on.
- **Impact:** A learner can post `passed: true` for any drill. That moves rank, reviews and the advanced-topic part of the black belt.
- **Fix:** this depends on C-2. Until a safe server grader exists, document that ranks and certificates are honour-system for drills, and rely on capstones (examiner-approved) for the certificate. Once C-2 is fixed, require `GRADING_MODE=server` in production (fail at startup otherwise).

---

## Medium

### M-1. Rate limits are per-instance without Upstash; sign-in is limited per email only

- **Rule:** NEXT-DOS-001
- **Evidence:**
  - `lib/rate-limit.ts:50-59`: an in-memory fallback, also used when Redis errors. It fails open and gives no startup warning.
  - `auth.config.ts:38`: sign-in is limited by email only, so a password-spraying attempt across many accounts is never throttled per IP. A victim can also be locked out on purpose.
  - `lib/rate-limit.ts:99` trusts the first `X-Forwarded-For` value. That's fine on Vercel, but can be spoofed when self-hosting.
- **Fix:**
  - Require the Upstash variables when `NODE_ENV=production`.
  - Add a per-IP sign-in limit next to the per-email one.
  - Take the client IP from the platform's header.

### M-2. Changing or resetting a password doesn't end other sessions

- **Rule:** NEXT-SESS-002
- **Evidence:**
  - `auth.config.ts:181`: sessions are 30-day JWTs.
  - `app/api/settings/password/route.ts:41` and `app/api/auth/password/reset/route.ts` only update the password hash.
  - `lib/api-auth.ts` (`withAuth`) only checks that the user still exists.
- **Impact:** A stolen session cookie survives the victim's password reset.
- **Fix:** add `passwordChangedAt` or `sessionVersion` to the user, put it in the JWT, and reject older tokens in `withAuth` and in page loads.

### M-3. OAuth sign-in grants bootstrap admin without checking the provider verified the email

- **Rule:** NEXT-AUTH-001
- **Evidence:**
  - `auth.config.ts:107-110`: every OAuth sign-in is allowed.
  - `auth.config.ts:170` (`linkAccount`): marks the email verified.
  - Nothing checks Google's `email_verified` or GitHub's verified-email list.
  - Account linking is not enabled (good).
- **Impact:** If the bootstrap email has no account yet, whoever first signs in through OAuth with that email becomes admin.
- **Fix:** require a verified provider email in the `signIn` callback, and fix C-1.

### M-4. Server self-fetches build their URL from the Host / X-Forwarded-Host header

- **Rule:** NEXT-HOST-001, NEXT-SSRF-001
- **Evidence:**
  - `lib/server-url.ts:7-17` builds `${proto}://${host}` from `x-forwarded-host`/`host` with no check.
  - It is used, with the user's cookie forwarded, at:
    - `app/(app)/profile/page.tsx:72`;
    - `app/(app)/projects/[id]/page.tsx:19`;
    - `app/(app)/admin/projects/page.tsx:19`.
- **Impact:** When self-hosted without a proxy that rewrites the header, a request with a crafted `X-Forwarded-Host` makes the server fetch an attacker-chosen URL (blind SSRF, internal metadata services). Browsers can't set this header on a victim's request, and Vercel overwrites it, so on Vercel the risk is low.
- **Fix:** call the underlying `lib/` functions directly instead of HTTP calls to your own API. Otherwise use `publicOrigin()` (configured).

### M-5. The lab URL probe's private-address block can be bypassed

- **Rule:** NEXT-SSRF-001
- **Evidence:**
  - `lib/labs.ts:128`: the `::ffff:` regex only matches the dotted form, and Node normalises `[::ffff:127.0.0.1]` to the hex `[::ffff:7f00:1]`.
  - The DNS check (`:148`) and the fetch (`:159`) do separate lookups, so DNS rebinding can slip between them.
  - `64:ff9b::/96`, `2002::/16` and `198.18.0.0/15` are not blocked.
  - The response body is returned to the learner.
- **What limits it:** HTTPS only, certificate checks, `redirect: "manual"`, and an 8 s timeout.
- **Fix:**
  - Check the canonical address with a library (`ipaddr.js` ranges).
  - Connect to the checked IP (an undici `Agent` with a validating `lookup`).
  - Cap the body size while reading.

---

## Low

- **L-1. Tutor (AI) replies are rendered as markdown with raw HTML on and no sanitizer.**
  - Evidence: `components/tutor/tutor-panel.tsx:230` passes the reply to `LessonContent`, and `components/lesson/lesson-content.tsx:391` uses `rehypeRaw`.
  - The CSP blocks script, but `<style>`, fake forms and `<meta refresh>` still get through. The impact is limited to the learner's own session.
  - Fix: render untrusted markdown without `rehypeRaw`, or add `rehype-sanitize`.
- **L-2. No Origin check on cookie-authenticated state changes** (NEXT-CSRF-001).
  - `SameSite=Lax` (Auth.js default) blocks cross-site requests. A same-site origin, such as a future subdomain, could still forge body-less POSTs (`quest/*`, `streak/ping`, `admin/content/refresh`).
  - `app/auth/session-ended` is a GET that clears the session (logout CSRF).
  - Fix: check `Origin` in `withAuth` for non-GET requests.
- **L-3. Examiner file download uses the learner-supplied MIME type.**
  - Evidence: `app/api/admin/projects/submissions/[submissionId]/file/[fileIndex]/route.ts:84`. `attachment` and `nosniff` limit the risk.
  - Fix:
    - always send `application/octet-stream`;
    - add `Content-Security-Policy: sandbox` to the response;
    - remove `\` and control characters from the filename.
- **L-4. The upload size check trusts the declared `size`.**
  - Evidence: `app/api/projects/[id]/submit/route.ts:21,29`. Base64 content can be about 84 MB with `size: 0`. Vercel's 4.5 MB body limit caps this in production.
  - Fix: derive the size from `content.length`.
- **L-5. Email tokens can be used twice under a race.**
  - Evidence: `lib/auth-tokens.ts:33-35` does `findUnique` then `deleteMany`.
  - Fix: `deleteMany` and accept only when `count === 1`.
- **L-6. CI and lab tokens are stored in plain text, and the CI token is public in the learner's workflow file.**
  - Evidence: `lib/ci/links.ts:85,99`. A pass still needs GitHub to confirm the run, but anyone can post bogus reports.
  - Fix: hash the tokens at rest, and ignore a report's `runId` until GitHub confirms it.
- **L-7. The browser loads Pyodide from jsDelivr without SRI, and installs unpinned PyPI wheels.**
  - Evidence: `public/workers/python-worker.mjs:36`.
  - Fix: pin `pkg==x.y`, or self-host the wheels and Pyodide.
- **L-8. Registration reveals whether an email has an account.**
  - Evidence: `app/api/auth/register/route.ts:23`. Forgot-password and resend are already uniform.
- **L-9. Account deletion doesn't ask for the password again.**
  - Evidence: `app/api/settings/delete/route.ts:6`. It's a `DELETE`, so cross-site CSRF is blocked.

## Informational

- `LAB_SIGNING_SECRET` is declared in `lib/env.ts` but never used: lab hooks rely on the 144-bit URL token.
- `proxy.ts:101`: the matcher skips paths ending in image extensions, so those responses get no CSP. The pages re-check auth.
- `app/certificates/[code]/image/route.tsx:189`: `public, max-age=3600`, so a withdrawn certificate's image may stay in caches for up to an hour.
- Drafts in `localStorage` are keyed by lesson, not by user, so they persist across accounts on a shared device.
- `app/api/profile/route.ts`: `image` accepts any URL scheme. It isn't rendered anywhere yet.
- The AI model id may contain `/` and `.`, which end up in the Gemini URL path. The host is fixed.

## Checked and fine

- **Secrets:**
  - Only `.env.example` is tracked, and the only public variable is `NEXT_PUBLIC_APP_URL`.
  - No `"use client"` file imports Prisma, crypto, env or auth.
- **Stored AI keys:**
  - `lib/crypto.ts` uses AES-256-GCM with a random 12-byte IV, a checked auth tag, and the user id as associated data.
  - Decrypted keys are never returned or logged.
- **Email tokens:** `lib/auth-tokens.ts` makes 256-bit random tokens, stores only their SHA-256, expires them after 24 h or 1 h, makes them single-use, and verification is POST-only. Passwords use bcrypt with cost 12.
- **Admin access:** checked against the database on every admin route and page. There are no Server Actions.
- **CSP** (`lib/csp.ts`):
  - script nonces;
  - no `unsafe-inline`/`unsafe-eval` for scripts in production;
  - `wasm-unsafe-eval` only for Pyodide;
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
- **Headers:** `nosniff`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` are set globally.
- **XSS:**
  - JSON-LD escapes `<`.
  - highlight.js output is escaped.
  - AI capstone reviews (`AiReviewBody`), submitted files and learner notes all render as React text. Prompt injection in a submission can't reach an HTML sink in the examiner's browser.
- **Links and outbound requests:**
  - GitHub URLs are pattern-checked.
  - The CI run URL is rebuilt on the server.
  - AI provider and GitHub hosts are fixed, with timeouts.
- **Email links** use the configured origin, not the Host header.
- **Redirects:** no open redirects. Sign-in returns a learner to the page that sent them there only when it's a path on this site (`lib/return-path.ts`: no `//host`, `/\host`, full URLs or control characters; unit-tested), else `/dashboard`. Auth.js keeps its same-origin default.
- **Caching:** `unstable_cache` only wraps global landing-page data.
- **Certificates:** public pages expose only the code, track, name and dates.
