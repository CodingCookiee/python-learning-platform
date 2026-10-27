# Status: where pylearn stands

Updated 2026-10-26. Keep this page short and current: rewrite it when the phase changes, rather than adding to it. The history lives in `docs/ARCHITECTURE.md` (dated notes); this page is only the present.

## The phase we're in

**v1 is built, and it passed its release QA. It's waiting on the owner's launch setup.** All 25 modules, 168 lessons and 24 capstones are written and validated. Every flow was tested end to end on a production build ([QA report](QA-REPORT-2026-10-19.md)), and a pre-launch review on 2026-10-26 fixed the security and correctness problems it found ([WHATS-LEFT.md](WHATS-LEFT.md) §5). No code task blocks launch.

## What's next, in order

1. **Launch (the owner's tasks, not code):** step by step in [LAUNCH-TASKS.md](LAUNCH-TASKS.md), with the detail in [WHATS-LEFT.md](WHATS-LEFT.md) §1–§2:
   - make the GitHub repo private (it holds the whole course and its solutions);
   - buy `pylearn.academy`;
   - create the production Neon database in AWS us-east-1;
   - set up Resend email and Upstash;
   - create the Vercel project with the listed variables (`GRADING_MODE=client`, Fluid compute on);
   - run `content:sync` after the first deploy;
   - sign in as the admin straight away.
2. **Right after launch:** [WHATS-LEFT.md](WHATS-LEFT.md) §3–§4. That means a production run-through with real email, the AI features tried with a real key, Search Console and Bing, and the first week's logs.
3. **Post-launch follow-ups:** [WHATS-LEFT.md](WHATS-LEFT.md) §6. First, after 2026-10-28, upgrade `next` to 16.4.1 or later and make CI's audit step blocking again; then the low security items and the small things.
4. **v1.1: multiple AI keys and a model switcher,** built and tested on `dev` on 2026-10-27, after the launch commit (`4d2dbca`): a key per provider, and a model menu in the tutor, the Sensei and both capstone reviews. Deploy it after launch ([WHATS-LEFT.md](WHATS-LEFT.md) §6). The design is in [the spec](superpowers/specs/2026-10-27-multiple-ai-models-design.md), the steps in [the plan](superpowers/plans/2026-10-27-multiple-ai-models-plan.md).
5. **v2: more languages, Go first:** [ARCHITECTURE.md](ARCHITECTURE.md) §17. The milestones run in this order:
   - **M9:** an execution sandbox, which also makes grading tamper-proof;
   - **M10:** multi-language foundations;
   - **M11:** the Go track.

   v1 keeps its Python-only copy. The taglines change only when the second language ships.

## Decisions waiting on the owner

- **Before v2's M10** ([ARCHITECTURE.md](ARCHITECTURE.md) §17):
  - keep the name "pylearn" or rename;
  - a belt ladder per language, or one shared;
  - the on-ramp in Python only, or one per language;
  - whether a Go black belt opens AI automation;
  - the sandbox budget.

## Last verified state (2026-10-26, after the pre-launch review)

| Check | Result |
|---|---|
| Type-check, lint | Clean |
| Unit tests | 182 passed (27 files) |
| Integration tests | 112 passed (18 files), 252 s with the dev database to themselves |
| Production build | Passes (68 routes) |
| Playwright (on Edge; Chrome isn't installed on this machine) | 16 of 16 passed |
| Accessibility (axe) | Clean on the auth pages, the fixed empty and error states and the 404 pages, light and dark |
| Dependency audit | 2 critical in `next` 16.3.8 (image optimizer, now off; `use cache`, unused). Fixed in 16.4.1: upgrade after 2026-10-28 |
| Old vs new code, same tests | Same speed (`progress-truth` 17 s both, `mastery` 25 s vs 27 s) |

**Testing here:** the dev database is remote and slow. Run integration tests and Playwright with nothing else using it (no dev server, no second test run), or tests time out and Neon drops connections. Don't run another Auth.js app on `localhost` at the same time: both use the `authjs.session-token` cookie, so each signs the other out.

## Good to know when picking this up

- **Dependencies were upgraded on 2026-10-19:** `next` 16.3.8, `next-auth` beta.32, `nodemailer` 10 (Auth.js's optional nodemailer peer is pointed at it through `overrides` in `package.json`). After pulling, run `npm install` and restart the dev server. If routes 404 oddly, delete `.next` and restart.
- **`GRADING_MODE=server` stops a production deploy** in the build (`scripts/check-production-env.ts`, run from `vercel.json`), and a server would refuse it at start too (`instrumentation.ts`). Both list each missing launch setting.
- **A password change ends every other session:** `User.sessionVersion`, compared by `withAuth` and the navbar (`lib/session-version.ts`).
- **Days are the learner's own:** streaks, the review cap, the AI cap and the training week use `User.timeZone` (`lib/day.ts`), saved from the browser by the streak ping.
- **Email lookups are exact** on the lower-cased address. Don't use Prisma's `mode: "insensitive"` for emails: it compiles to `ILIKE`, where `_` is a wildcard.
- **Test builds go to `.next-e2e` on :3010**, never into `.next` (see HOW-WE-WORK.md, "The local environment").
- **The owner commits.** Check `git status` to see what's waiting.
