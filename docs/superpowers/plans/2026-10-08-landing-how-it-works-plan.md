# Landing page "How it works": implementation plan

Spec: [2026-10-08-landing-how-it-works-design.md](../specs/2026-10-08-landing-how-it-works-design.md) · Date: 2026-10-08

Six tasks in the spec's build order. Each lists files, tests written first where behaviour can be
tested, verification and when it's done. Every task ends with `npm run typecheck`, `npm run lint` and
`npm test` passing. The agent doesn't commit; the owner does.

Facts from the code that shape the plan:
- `app/page.tsx` is a server component: it redirects signed-in visitors, loads modules and counts in one
  `Promise.all`, and renders `Hero` then the syllabus, rank, JavaScript-bridge, record and close sections.
- `components/landing/hero.tsx` is a client component. It renders `LiveDrill` and owns the belt ladder's
  `stripes` state (`onPass` sets it), so the sandbox plugs into the same callback.
- `usePyodide()` (`lib/pyodide.ts`) returns `run(code, timeoutMs)` → `{ output, error }` and `loading`;
  `getPythonRuntime().preload()` (`lib/python-runtime.ts`) starts the download without running anything.
- A module's hours are stored in `Module.duration` (`content:sync` rounds the YAML's `hours`).
- No page emits JSON-LD yet. Every page has a CSP nonce in the `x-nonce` request header (`lib/csp.ts`),
  which the root layout already reads.
- `app/auth/signup/page.tsx` is a server page that renders the client `SignUpForm`; onboarding's form
  keeps the experience answer in `useState(initial.experience)`.
- Next.js here is 16.2: read `node_modules/next/dist/docs/` for page `searchParams` before Task 4.

---

## Task 1. Sandbox logic

**Files:** new `lib/landing/try-it.ts`, new `tests/unit/try-it.test.ts`.

**Tests first** (unit):
- `checkFix({ output, error })` passes only when there's no error and the output is exactly
  `Welcome to the café!` (a trailing newline allowed);
- it fails with the reason for: wrong text, extra output, an error;
- `errorLine(traceback)` is the traceback's last non-empty line (`SyntaxError: unterminated string
  literal (detected at line 1)` for the broken line);
- the three sensei lines are one or two sentences each.

**Change:** `STEP1_CODE`, `BROKEN_CODE`, `EXPECTED`, `checkFix`, `errorLine`, and `TRY_IT_LINES`
(the sensei's three lines, kept together for review like `lib/quest-steps.ts`). No React, no Python.

**Done when:** the tests pass.

## Task 2. The sandbox and the hero

**Files:**
- new `components/landing/try-it.tsx`;
- `components/landing/hero.tsx` (copy, the two ways in, the stat line, `TryIt` in place of `LiveDrill`);
- delete `components/landing/live-drill.tsx` once nothing imports it.

**Change:**
- A labelled region "Try it" with three steps, dots (buttons, "Step n of 3", `aria-current`) and
  Back/Next; the sensei's head and the step's line.
- Step 1: the line, **Run**, the output.
- Step 2: a monospace `<textarea>` with `BROKEN_CODE`, **Run** (shows `errorLine` or the output),
  **Run tests** (`checkFix`), **Reset**, Ctrl/Cmd+Enter runs the tests.
- A pass calls `onPass` (the belt ladder presses its stripe) and moves to step 3: "Make it count" and
  **Sign up free** (`/auth/signup`).
- `getPythonRuntime().preload()` on the frame's first `pointerenter`, `touchstart` or `focusin`;
  "Loading Python…" while it loads.
- If the runtime fails to start, the fallback: expected output and the error/fixed output as text, a
  plain note, and **Sign up free**.
- Results in a polite live region; reduced motion skips the stripe press.
- Hero: the new line, **I've never coded →** (`/auth/signup?start=new`) and **I already code →**
  (`/auth/signup`), and the stat line with "free".

**Verify:** a production build; screenshots of `/` signed out with each step done for real, in light and
dark and at phone width; axe on the hero.
**STOP for the owner's review of the sandbox and the sensei's three lines** before Task 3.

## Task 3. How it works, Who it's for, the FAQ

**Files:**
- new `components/landing/how-it-works.tsx`, `components/landing/who-its-for.tsx`,
  `components/landing/faq.tsx`;
- new `lib/landing/facts.ts` (`getCourseHours()`: hours per track from `Module.duration`, and
  `paceLine(hours, perWeek)`);
- `app/page.tsx` (order, data, the close, JSON-LD);
- new `tests/unit/landing-facts.test.ts` and `tests/integration/landing.test.ts`.

**Tests first:**
- Unit: `paceLine(133, 5)` reads "roughly six months at 5 hours a week"; small and large totals round
  sensibly (weeks under two months, months up to a year, then years).
- Integration: `getCourseHours()` returns the start, python and automation totals from the synced
  content (4, 133 and 84 today).

**Change:**
- **How it works** replaces the rank section: the heading, "Rank is earned, not clicked." as its
  subheading, the opening line, seven stops (1–3 tagged "You just tried this", the seal on Gradings,
  the fading stripe on Belts).
- **Who it's for:** three cards and the 16+ line; the developer card links to `#bridge`.
- **FAQ:** `<details>`/`<summary>`; hours from `getCourseHours()`; a `FAQPage` JSON-LD script with the
  request's nonce.
- **Page order:** hero, How it works, Who it's for, syllabus, bridge, record, FAQ, close.
- **Close:** the two ways in, and "I already have an account".

**Verify:** the page in light and dark, phone width; axe; the JSON-LD parses and matches the visible FAQ.

## Task 4. Ways in

**Files:** `app/auth/signup/page.tsx`, `app/auth/signup/_components/signup-form.tsx`,
`components/onboarding/onboarding-form.tsx`, new `lib/start-intent.ts`.

**Change:**
- `lib/start-intent.ts`: `rememberStart`, `readStart`, `forgetStart` around `localStorage` key
  `pylearn:start` (only `"new"` is kept; every access wrapped in try/catch).
- The sign-up page passes `start` from `searchParams` to the form; the form remembers it on mount.
- Onboarding: when `initial.experience` is null and the learner hasn't chosen, "New to programming" is
  pre-selected if `readStart()` is `"new"` (read with `useSyncExternalStore`, as `lesson-workspace.tsx`
  does). `forgetStart()` after a successful save.

**Verify:** in the browser: `?start=new` → sign-up → onboarding with "New to programming" selected;
plain `/auth/signup` → nothing selected; a Google or GitHub sign-up isn't run, but the key is stored
before the provider redirect.

## Task 5. Words elsewhere, docs, memory

**Files:** `app/llms.txt/route.ts`, `app/layout.tsx` (the description), `docs/ARCHITECTURE.md` (M8 row
and the status bullets), the project memory.

**Change:** `/llms.txt` speaks to anyone and says it's free with the learner's own key for AI; the site
description adds "Free, no experience needed."; ARCHITECTURE.md marks M8 part 3 done.

## Task 6. End-to-end and wrap-up

1. A production build with email off, a new `.impeccable/landing-e2e.mjs`:
   - signed out: the sandbox's three steps for real, the stripe on the belt ladder, Back/Next and the
     keyboard;
   - the Pyodide CDN blocked (`Network.setBlockedURLs`): the fallback and **Sign up free**;
   - **I've never coded** through sign-up to onboarding's pre-selection, and **I already code** with
     none (throwaway accounts, deleted afterwards; sign-up allows 5 an hour);
   - phone width; axe in light and dark on the whole page.
2. Full suites: unit, integration, python, typecheck, lint.

## Order and checkpoints

Tasks 1 → 2 → **owner reviews the sandbox and its lines** → 3 → 4 → 5 → 6.
