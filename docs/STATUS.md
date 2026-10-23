# Status: where pylearn stands

Updated 2026-10-23. Keep this page short and current: rewrite it when the phase changes, rather than adding to it. The history lives in `docs/ARCHITECTURE.md` (dated notes); this page is only the present.

## The phase we're in

**v1 is built, and it passed its release QA. It's waiting on the owner's launch setup.** All 25 modules, 168 lessons and 24 capstones are written and validated. Every flow was tested end to end on a production build ([QA report](QA-REPORT-2026-10-19.md)). No code task blocks launch.

## What's next, in order

1. **Launch (the owner's tasks, not code):** the decision and setup in [WHATS-LEFT.md](WHATS-LEFT.md) §1–§2:
   - buy `pylearn.academy`;
   - create the production Neon database in AWS us-east-1;
   - set up Resend email and Upstash;
   - create the Vercel project with the listed variables (`GRADING_MODE=client`, Fluid compute on);
   - run `content:sync` after the first deploy;
   - sign in as the admin straight away.
2. **Right after launch:** [WHATS-LEFT.md](WHATS-LEFT.md) §3–§4. That means a production run-through with real email, the AI features tried with a real key, Search Console and Bing, and the first week's logs.
3. **Post-launch follow-ups:** [WHATS-LEFT.md](WHATS-LEFT.md) §6. That's security M-2 (end other sessions on a password change) first, then the small items and dead-code cleanup.
4. **v2: more languages, Go first:** [ARCHITECTURE.md](ARCHITECTURE.md) §17. The milestones run in this order:
   - **M9:** an execution sandbox, which also makes grading tamper-proof;
   - **M10:** multi-language foundations;
   - **M11:** the Go track.

   v1 keeps its Python-only copy. The taglines change only when the second language ships.

## Decisions waiting on the owner

- **Honour-system grading for v1.** With `GRADING_MODE=client`, a forged request can mark drills and gradings passed. Capstones and certificates still need an examiner. The recommendation is to accept it for v1 ([WHATS-LEFT.md](WHATS-LEFT.md) §1).
- **Before v2's M10** ([ARCHITECTURE.md](ARCHITECTURE.md) §17):
  - keep the name "pylearn" or rename;
  - a belt ladder per language, or one shared;
  - the on-ramp in Python only, or one per language;
  - whether a Go black belt opens AI automation;
  - the sandbox budget.

## Last verified state (2026-10-20, on the final code)

| Check | Result |
|---|---|
| Type-check, lint | Clean |
| Unit tests | 159 passed |
| Integration tests | 91 passed |
| Python runner tests | Passed |
| Content validation | 831 drills and 1,155 examples, 0 errors |
| Production build | Passes |
| Playwright | 16 of 16 passed |
| Exploratory QA (`.impeccable/qa-explore.mjs`) | 47 of 47 passed |
| Regression scripts | All passed |
| Accessibility audit | 40 surfaces, 0 axe violations, 0 overflow |
| Dependency audit | 0 critical; 7 high, all in Prisma's CLI tooling, Next's build tooling and Monaco's bundled DOMPurify |

Since then (2026-10-23), the AI routes declare `maxDuration` for Vercel, and the docs were refreshed. Type-check, lint and the production build pass after that change.

## Good to know when picking this up

- **Dependencies were upgraded on 2026-10-19:** `next` 16.3.8, `next-auth` beta.32, `nodemailer` 10 (Auth.js's optional nodemailer peer is pointed at it through `overrides` in `package.json`). After pulling, run `npm install` and restart the dev server. If routes 404 oddly, delete `.next` and restart.
- **Production refuses to start with `GRADING_MODE=server`**, and logs each missing launch setting (`instrumentation.ts`, `lib/env.ts`).
- **Test builds go to `.next-e2e` on :3010**, never into `.next` (see HOW-WE-WORK.md, "The local environment").
- **The owner commits.** Check `git status` to see what's waiting.
