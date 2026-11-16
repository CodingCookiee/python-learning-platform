# Status: where pylearn stands

Updated 2026-11-12. Keep this page short and current: rewrite it when the phase changes, rather than adding to it. The history lives in `docs/ARCHITECTURE.md` (dated notes); this page is only the present.

## The phase we're in

**v1 is built, and it passed its release QA. It's waiting on the owner's launch setup.** All 25 modules, 168 lessons and 24 capstones are written and validated. Every flow was tested end to end on a production build ([QA report](QA-REPORT-2026-10-19.md)), and a pre-launch review on 2026-10-26 fixed the security and correctness problems it found ([WHATS-LEFT.md](WHATS-LEFT.md) §5). No code task blocks launch.

Since the launch commit (`4d2dbca`), `dev` has gained v1.1 and a few fixes (step 4 below). The owner commits them as they land.

## What's next, in order

1. **Launch (the owner's tasks, not code):** step by step in [LAUNCH-TASKS.md](LAUNCH-TASKS.md), with the detail in [WHATS-LEFT.md](WHATS-LEFT.md) §1–§2:
   - decide which commit to launch from (below, "Decisions waiting on the owner");
   - make the GitHub repo private (it holds the whole course and its solutions);
   - buy `pylearn.academy`;
   - create the production Neon database in AWS us-east-1;
   - set up Resend email and Upstash;
   - create the Vercel project with the listed variables (`GRADING_MODE=client`, Fluid compute on, `ADMIN_BOOTSTRAP_EMAIL` set to the owner's sign-in address);
   - run `content:sync` after the first deploy;
   - sign in as the admin straight away.
2. **Right after launch:** [WHATS-LEFT.md](WHATS-LEFT.md) §3–§4. That means a production run-through with real email, the AI features tried with a real key, Search Console and Bing, and the first week's logs.
3. **Post-launch follow-ups:** [WHATS-LEFT.md](WHATS-LEFT.md) §6. First:
   - **upgrade `next`, now due:** it's still 16.3.8, and 16.4.1 (which fixes its two critical advisories) passed two weeks old on 2026-10-28. Then make CI's audit step blocking again;
   - **run the drill editor's Playwright spec** (`tests/e2e/drills/drill-editor.spec.ts`), which was written on 2026-11-03 but hasn't run yet;
   - then the low security items and the small things.
4. **What's on `dev` after the launch commit:**
   - **v1.1, multiple AI keys and a model switcher** (2026-10-27): a key per provider, and a model menu in the tutor, the Sensei and both capstone reviews. The owner chose to deploy it after launch ([WHATS-LEFT.md](WHATS-LEFT.md) §6). The design is in [the spec](superpowers/specs/2026-10-27-multiple-ai-models-design.md), the steps in [the plan](superpowers/plans/2026-10-27-multiple-ai-models-plan.md).
   - **The bot check no longer hangs sign-in over plain HTTP** (2026-10-28), for example on `http://192.168.x.x` during LAN testing. Production is HTTPS, so it never hit there.
   - **Lessons and Settings centred, and lessons widened** to 80-character lines (2026-11-03): the layout rules are in [DESIGN.md](../DESIGN.md).
   - **The drill editor keeps the cursor where you type** (2026-11-03, `4b82d71`). Before, typing on a busy page could throw it to the end and drop letters. `4d2dbca` has this bug.
5. **v2: more languages, Go first:** [ARCHITECTURE.md](ARCHITECTURE.md) §17. The milestones run in this order:
   - **M9:** an execution sandbox, which also makes grading tamper-proof;
   - **M10:** multi-language foundations;
   - **M11:** the Go track.

   v1 keeps its Python-only copy. The taglines change only when the second language ships.

## Decisions waiting on the owner

- **Which commit to launch from.** `4d2dbca` is v1 as QA'd, but it has the drill editor's cursor bug. Either:
  - **(Recommended)** launch from `4d2dbca` with the editor fix cherry-picked on top. This keeps the decision to ship v1.1 after launch. `4b82d71` applies cleanly to `4d2dbca` except its ARCHITECTURE.md note, which conflicts (checked 2026-11-12);
  - or launch from `dev`'s head. v1.1 comes along, and its migration applies itself in the build.
- **The owner's email address in git history.** An early version of the `regex-mask-emails` drill used it (commit `468d262`, removed in `4c2d1d0`). Making the repo private keeps it from the public. Removing it from history means rewriting history and force-pushing, so it's only done if the owner asks.
- **Before v2's M10** ([ARCHITECTURE.md](ARCHITECTURE.md) §17):
  - keep the name "pylearn" or rename;
  - a belt ladder per language, or one shared;
  - the on-ramp in Python only, or one per language;
  - whether a Go black belt opens AI automation;
  - the sandbox budget.

## Last verified state

The full run was on 2026-10-26, after the pre-launch review:

| Check | Result |
|---|---|
| Type-check, lint | Clean |
| Unit tests | 182 passed (27 files) |
| Integration tests | 112 passed (18 files), 252 s with the dev database to themselves |
| Production build | Passes (68 routes) |
| Playwright (on Edge, since Chrome isn't installed on this machine; `PW_CHANNEL=msedge` does that now) | 16 of 16 passed |
| Accessibility (axe) | Clean on the auth pages, the fixed empty and error states and the 404 pages, light and dark |
| Dependency audit | 2 critical in `next` 16.3.8 (image optimizer, now off; `use cache`, unused). Fixed in 16.4.1: the upgrade is due |
| Old vs new code, same tests | Same speed (`progress-truth` 17 s both, `mastery` 25 s vs 27 s) |

The changes since were checked as they were made, not with a full run:

- **v1.1:** tested on 2026-10-27 ([ARCHITECTURE.md](ARCHITECTURE.md), its dated note).
- **On 2026-11-03:**
  - type-check and lint are clean, 204 unit tests pass, and the production build passes;
  - lessons were measured symmetric from 1024px to 1920px, with axe clean and no sideways scroll;
  - the drill editor's cursor test, at 6x CPU slowdown on Edge, jumped in 4 of 4 rounds before the fix and 0 of 4 after.
- **Not run since 2026-10-26:**
  - the integration tests;
  - the full Playwright suite, which is now 20 tests, including the 2 new drill-editor tests.

**Testing here:** the dev database is remote and slow. It's in Singapore: each query takes 100 to 140 ms to reach it and come back, and the route stalls now and then for seconds, sometimes a minute. So a local drill pass (up to 46 queries) can take from 5 s to over a minute; production, beside its database, doesn't have this (ARCHITECTURE.md, 2026-11-16). Run integration tests and Playwright with nothing else using it (no dev server, no second test run), or tests time out and Neon drops connections. Don't run another Auth.js app on `localhost` at the same time: both use the `authjs.session-token` cookie, so each signs the other out.

## Good to know when picking this up

- **Dependencies were upgraded on 2026-10-19:** `next` 16.3.8, `next-auth` beta.32, `nodemailer` 10 (Auth.js's optional nodemailer peer is pointed at it through `overrides` in `package.json`). After pulling, run `npm install` and restart the dev server. If routes 404 oddly, delete `.next` and restart.
- **The dev database is a copy of `content/`.** After pulling content changes, run `npm run content:sync`; it keeps progress. It went stale from 2026-10-14 to 2026-11-10, and drill pages kept showing an example that had already been fixed in the files.
- **The super admin** is whoever first signs in with `ADMIN_BOOTSTRAP_EMAIL` with a proven address, while no admin exists (`lib/admin/bootstrap.ts`). After that, admins are made in Admin → Users, and the last active super admin can't be removed.
- **The code editor owns its text.** `PythonEditor` gives Monaco a `defaultValue`, and writes outside changes (Reset, a solution arriving) in itself. Don't pass `value` to `@monaco-editor/react`: it replaces the whole text whenever React is a keystroke behind, which throws the cursor to the end (Monaco 0.55 types through EditContext on Chrome and Edge).
- **`GRADING_MODE=server` stops a production deploy** in the build (`scripts/check-production-env.ts`, run from `vercel.json`), and a server would refuse it at start too (`instrumentation.ts`). Both list each missing launch setting.
- **A password change ends every other session:** `User.sessionVersion`, compared by `withAuth` and the navbar (`lib/session-version.ts`).
- **Days are the learner's own:** streaks, the review cap, the AI cap and the training week use `User.timeZone` (`lib/day.ts`), saved from the browser by the streak ping.
- **Email lookups are exact** on the lower-cased address. Don't use Prisma's `mode: "insensitive"` for emails: it compiles to `ILIKE`, where `_` is a wildcard.
- **Test builds go to `.next-e2e` on :3010**, never into `.next` (see HOW-WE-WORK.md, "The local environment").
- **The owner commits.** Check `git status` to see what's waiting.
