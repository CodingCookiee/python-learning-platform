# How we work on pylearn

This is for any AI agent starting a session on this repo. It covers how the owner works, what they expect from you, and the rules that hold in every session. Read it before you change anything. The product itself is described in `PRODUCT.md`, the visual system in `DESIGN.md`, and the build in `docs/ARCHITECTURE.md`.

## Contents

- [The project in one paragraph](#the-project-in-one-paragraph)
- [Where the truth lives](#where-the-truth-lives)
- [How the owner communicates](#how-the-owner-communicates)
- [When to ask and when to act](#when-to-ask-and-when-to-act)
- [The product standard](#the-product-standard)
- [The engineering standard](#the-engineering-standard)
- [Verifying your work](#verifying-your-work)
- [Hard rules](#hard-rules)
- [The local environment](#the-local-environment)
- [Reporting back](#reporting-back)
- [Decisions already made](#decisions-already-made)

## The project in one paragraph

pylearn teaches Python from first syntax to advanced confidence, then AI automation. It is built as a martial-arts school: 16 Python modules are the kyu grades from white belt to black belt, and 8 automation modules are the dan grades. Learners practise in the browser (Pyodide), earn stripes by passing gradings (checkpoints), and keep skills alive with spaced review. A sensei character guides the first session. It is free; the optional AI features (tutor, Sensei, reviews) run on the learner's own Anthropic, OpenAI or Google key. The stack is Next.js 16 (App Router, `proxy.ts`, React 19 with the React Compiler), Tailwind v4, Prisma 7 on Postgres (Neon), Auth.js v5 with JWT sessions, Vitest and Playwright.

## Where the truth lives

| File | What it holds |
|---|---|
| `PRODUCT.md` | Users, purpose, positioning, brand commitments |
| `DESIGN.md` | The visual system: colours, type, shapes, every brand component and its rules. Follow it exactly |
| `docs/ARCHITECTURE.md` | How the platform is built, plus dated notes on every significant change |
| `docs/WHATS-LEFT.md` | What's left before launch, and the production steps (env vars, migrations to deploy) |
| `docs/CURRICULUM.md`, `docs/CONTENT.md` | The course and how content files are written and synced |
| `security_best_practices_report.md` | The security review: what's fixed and what's open |
| `docs/AI-INTEGRATION.md` | How the AI features work and the rules every new AI feature follows |
| `docs/superpowers/specs/`, `plans/` | Approved designs and implementation plans for larger features |
| `lib/quest-steps.ts` | The sensei's lines. The owner approved every one; change them only with their say |

When you finish something significant, add a dated bullet to `docs/ARCHITECTURE.md`. If it adds or changes a visual piece, update `DESIGN.md`. If it adds a launch step (a migration, an env var), update `docs/WHATS-LEFT.md`.

## How the owner communicates

- **Short, fast messages**, often with typos, often with a screenshot. Read the screenshot carefully: it is usually the whole bug report. "This button", "this section" and "here" refer to what's in it.
- **New requests arrive while you're working.** Acknowledge each one in a line, finish or park what you're doing safely, and handle it in the same turn. Don't drop the earlier task: say where it stands. A bug they hit right now comes before polish.
- **"How come?" means: explain the root cause, then fix it.** Say plainly whether the behaviour was a bug or expected. If it was expected (for example the same "check your inbox" answer for every address on password reset, to prevent account discovery), explain why it's the standard, and show the evidence you checked.
- **"Is this the industry standard?" is a real question.** Answer it directly, with the standard named (NIST SP 800-63B, OWASP), then offer or make the fix.
- **"Go ahead", "do all", "fix it" mean act now**, on everything listed, without asking again.
- **They test as a user would**: several accounts in one browser, deleting accounts, following real emails, using the quest from the start. Expect bugs that only show up that way, and test that way yourself.

## When to ask and when to act

- Ask only when the decision is genuinely theirs: product behaviour, privacy trade-offs, anything outward-facing or hard to undo. Use multiple-choice questions, put your recommended option first and mark it "(Recommended)", and explain the trade-off in one or two lines per option. The owner usually picks the recommendation.
- Everything else: make the obvious choice, say what you chose in your report, and carry on.
- Their decisions stand. Don't relitigate them, and don't quietly undo them. If you argued for something and they chose otherwise (for example branded spinners in buttons), do it their way, well.
- For new subsystems, design first: a short design in chat for bounded work, a written spec in `docs/superpowers/specs/` and a plan for larger work, approved before building.

## The product standard

**Premium, never generic.** Every surface is built from the brand, not from library defaults: the knot mark, belt cloth and tape, the examiner's seal, the sensei, the condensed type. In practice:

- Loaders are the knot being tied (`KnotLoader`, `Spinner` in buttons) or the belt being taped (`BeltLoader` for long staged waits). Never a stock spinner.
- Empty sections use `EmptySlot`. Skeletons use the tape sweep. Celebrations are falling belt cloth, not confetti. Dialogs, menus and tooltips wear the learner's belt edge.
- Icons for owned concepts are the brand marks in `components/brand/marks.tsx` (streak, XP, rank, seal, locked, sensei, sheet). Plain utility icons (arrows, close) can stay lucide.
- Use the learner's own belt colour where it makes sense (`--loader-belt`, set from `data-belt` on `<html>`).
- If you're about to ship a library default, stop and ask whether it's invisible plumbing. If it isn't, brand it.

**Colour:** soft but alive. Jade green and straw yellow over green-tinted neutrals. Loud reds, neon and dull grey or slate have all been rejected.

**Every wait says what it's doing.** Use `LoadingButton` with a short verb, `PendingLine` for staged lines that name the real phases (with "still working" and "slow" lines), a `loading.tsx` shaped like the page for every signed-in route, and `startNavigation()` before `router.push`. A button that looks dead or a blank page counts as a bug.

**Copy:** plain language a beginner understands, in sentence case. Letter-spaced uppercase belongs only to the seal. Use the dojo voice lightly (belts, gradings, training), never cute. Be honest about cost: free, with AI on the learner's own key.

**Accessibility and phones count:** pages are axe-clean, errors are tied to their fields (`aria-describedby`), every control shows the pointer cursor, and layouts work at phone width. Respect reduced motion.

## The engineering standard

- **This is Next.js 16, not the version in your training data.** Read the guide in `node_modules/next/dist/docs/` before using an API (see `AGENTS.md`).
- **Root cause, not symptoms.** When something misbehaves, find out why (query the database, trace the code, reproduce it in a browser), fix the cause, and add a regression test that would have caught it.
- **Industry standard by default**, and say which standard. For example: passwords follow NIST SP 800-63B (length over composition, breached-password check, no reuse of the current password); emails are normalised; sessions, tokens and links are revoked when an account is deleted.
- **Security and privacy first.** Keep only what's needed (blocked addresses are a keyed fingerprint, not the address). Clear an account's data from the browser on sign-out. Don't leak who has an account.
- **Match the surrounding code**: its naming, comment density and idioms. Comments explain why, in plain sentences.
- **Keep scope tight**, but fix what you break and the obvious adjacent bug you find (say so in your report).
- **Database changes ship as migrations** in `prisma/migrations/`. Apply additive ones to the dev database with `npx prisma migrate deploy`, run `npx prisma generate`, and list each new migration in `docs/WHATS-LEFT.md` for production.

## Verifying your work

"It should work" isn't done. Before you report:

1. `npx tsc --noEmit` and `npx eslint <changed paths>`: clean.
2. Tests: `npm test` (unit), `npm run test:integration` (real dev database), and `npx playwright test` for anything user-facing. Add tests for what you built or fixed.
3. **Look at it.** Build, run it, and screenshot the real surface: desktop and phone, light and dark where relevant. Then read the screenshots and critique them. Fix what you see in one batch, recheck once, and stop.
4. For flows, drive them end to end in a browser with throwaway accounts, the way the owner would (sign up, quest, drills, admin actions).

## Hard rules

- **Never commit or push** unless the owner asks. They commit themselves.
- **Never print, paste or log secrets** (API keys, `.env` values, tokens, passwords). If the owner pastes one, tell them to rotate it, and never repeat it.
- **The owner's account is the only real admin.** Never use it, change it or touch real accounts. Test with throwaway `@example.invalid` accounts (`.impeccable/quest-e2e-db.ts` creates them) and delete them afterwards.
- **Don't stop or restart the owner's dev server** on :3000. Tell them when it needs a restart.
- **Don't publish personal details.** The About page names no person. The contact address comes from `CONTACT_EMAIL`. Personal GitHub or LinkedIn profiles are never the organisation's `sameAs`.
- **Don't work around a denied permission or a safety block.** Explain what you couldn't do and hand that step to the owner.
- **Don't download new executables.** For example, Playwright runs with video off rather than fetching ffmpeg.
- **Keep `GRADING_MODE=client`** until server grading has a sandbox (security report C-2).

## The local environment

- **OS and shell:** Windows, with Git Bash for scripts and PowerShell available. Bash heredocs mangle backticks and backslashes, so write multi-line patches as files (a Python script in your scratchpad, or the Write/Edit tools) rather than inline.
- **Dev server:** the owner's, on :3000. Running `next build` into `.next` while it runs corrupts its cache. Build tests into their own folder instead:
  `NEXT_DIST_DIR=.next-e2e AUTH_URL=http://localhost:3010 npm run build`
  then `NEXT_DIST_DIR=.next-e2e npx next start -p 3010`. Playwright uses :3010 and the installed Chrome (`NEXT_DIST_DIR=.next-e2e npx playwright test`).
- **The database is a remote Neon dev branch and it's slow.** Allow long timeouts in browser tests (pages can take 10 seconds or more to stream in).
- **Helpers:** `.impeccable/quest-e2e-db.ts` seeds and cleans test accounts (`fresh`, `existing`, `tour`, `bug-step`, `examiner`, `cleanup`, `cleanup-prefix`, and more). `.impeccable/*.mjs` are browser probes and screenshot scripts; screenshots go to the scratchpad or `.impeccable/review/`.
- **Quirks:** on Windows, Vitest prints "something prevents the main process from exiting" but exits 0. Playwright screenshots add a caret-colour hydration warning that isn't an app bug. Prettier reformats on save, so re-read a file before editing it by exact string.

## Reporting back

- Open with the outcome, in plain words.
- Then what changed, grouped by what the owner asked for, with file links.
- Then how it was verified (which tests, which screens you looked at), and anything that failed, with the output.
- Then anything they need to do (restart the dev server, rotate a key, deploy a migration), and what's still open, briefly.
- No hedging on things you verified, and no claims about things you didn't.

## Decisions already made

Don't reopen these. `docs/ARCHITECTURE.md` and `PRODUCT.md` have the detail.

- Free, with AI on the learner's own key. The default model is the newest Sonnet.
- 16 Python modules (kyu) and 8 automation modules (dan). The beginner on-ramp sits before the white belt, outside the grades. n8n appears only as labs.
- No age requirement.
- Belt test-out, a lean dashboard, and a learning log that drafts facts only.
- Two admin levels: Admin (reviews submissions, read-only overview) and Super admin (full control, audit log, notification bell).
- The Sensei assistant sits bottom-right, on the learner's key, with session memory. It's off on drills (where the tutor is) and during gradings.
- Deleting an account can bar its address from signing up again. That's for admin deletions only, it stores a fingerprint, and it's ticked by default.
- Production domain: pylearn.academy.
