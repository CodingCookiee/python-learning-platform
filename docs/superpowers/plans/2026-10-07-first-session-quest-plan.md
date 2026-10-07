# First-session quest: implementation plan

Spec: [2026-10-07-first-session-quest-design.md](../specs/2026-10-07-first-session-quest-design.md) · Date: 2026-10-07

Seven tasks in the spec's build order. Each lists files, tests written first where behaviour can be
tested, verification and when it's done. Every task ends with `npm run typecheck`, `npm run lint` and
`npm test` passing. The agent doesn't commit; the owner does.

Facts from the code that shape the plan:
- `app/(app)/layout.tsx` is a server component with no session lookup. The panel is a client component
  placed there that loads its own state (`GET /api/quest`) on mount and on route change.
- Drill passes are recorded in two places: `app/api/progress/exercise/route.ts` (browser grading) and
  `app/api/exercises/[id]/submit/route.ts` (server grading).
- Lesson examples run in `components/lesson/code-block.tsx` (its Run button); the scratchpad runs in
  `components/lesson/lesson-workspace.tsx`.
- First-time onboarding is detected in `lib/onboarding.ts` (`onboardedAt` was null).
- After a Prisma schema change the running dev server must be restarted (it caches the client).

Browser actions reach the quest through one in-page event, so components never call the quest API:
- `window.dispatchEvent(new CustomEvent("pylearn:quest-action", { detail: { step } }))` for `run-code`
  and `scratchpad`.
- `"pylearn:quest"` (no detail) after a drill submit or lesson completion, meaning "refresh".

---

## Task 1. Quest data, rules and reward

**Files:**
- `prisma/schema.prisma` and a new migration;
- new `lib/quest.ts`;
- `lib/content/schema.ts` and `lib/achievements.ts` (the criterion);
- `content/achievements.yaml`;
- new `tests/unit/quest.test.ts`;
- new `tests/integration/quest.test.ts`.

**Tests first:**
- Unit (pure functions in `lib/quest.ts`):
  - `currentStep(completed)` is the first step not done, in any order;
  - `stepLinks(path)` gives the beginner's and the developer's lesson 1;
  - `isBugDrill({ slug, type })` is true for any `fix` drill and for the two designated bug drills.
- Unit: the `quest { quest }` criterion is met only when that quest is in `stats.questsFinished`.
- Integration:
  - `startQuest` creates the row once;
  - `recordStep` adds a step once;
  - the fifth step sets `finishedAt` and returns Ready to Train exactly once;
  - `skipQuest`/`resumeQuest` keep steps;
  - `seedFromHistory` ticks `first-drill` and `fix-bug` from passed drills.

**Change:**
- `QuestProgress { id, userId, quest, completed String[], startedAt, finishedAt?, skippedAt? }`, unique
  (`userId`, `quest`), cascade on user, mapped to `quest_progress`. Write the migration by hand, check it
  against `prisma migrate diff` from the committed schema, apply it with `migrate deploy`, then `generate`.
- `lib/quest.ts`:
  - `FIRST_SESSION`, and `STEPS` (key, title, sensei line, target, where);
  - `getQuest`, `startQuest`, `recordStep`, `recordDrillPass(userId, drill)`, `skipQuest`, `resumeQuest`,
    `seedFromHistory`;
  - the pure helpers above.
- Criterion `quest { quest: slug }`; `LearnerStats.questsFinished: Set<string>` from finished
  `QuestProgress` rows.
- `achievements.yaml`: `ready-to-train` (Ready to Train, silver, 50 XP, icon `Swords`, added to
  `lib/achievement-icon.tsx`).

**Done when:** the tests pass and the migration is applied to the dev database.

## Task 2. API routes and hooks

**Files:**
- new `app/api/quest/route.ts` (GET);
- new `app/api/quest/event/route.ts`, `app/api/quest/start/route.ts`, `app/api/quest/skip/route.ts`,
  `app/api/quest/resume/route.ts`;
- `lib/onboarding.ts`;
- `app/api/progress/exercise/route.ts` and `app/api/exercises/[id]/submit/route.ts`;
- `lib/rate-limit.ts` (a `questEvent` limit);
- `tests/integration/quest.test.ts`.

**Tests first** (integration):
- First-time `saveOnboarding` starts the quest; a later plan change doesn't restart it.
- The event handler accepts `run-code`, `scratchpad` and `progress` only while the quest is active; it
  refuses `first-drill`, `fix-bug` and unknown keys (400), and returns 409 when finished or skipped.
- A recorded drill pass ticks `first-drill`; a fix drill also ticks `fix-bug`.
- "No thanks" (skip with no steps) ends the offer.

**Change:** the routes use `withAuth` and return `getQuest`. Drill passes call `recordDrillPass` after
the submission is stored; quest failures are logged and never fail the submission.

**Done when:** the tests pass.

## Task 3. The sensei

**Files:** new `components/quest/sensei.tsx` (SVG, `mood: "calm" | "pleased"`, `size`), and the lines in
`lib/quest.ts`.

**Change:**
- A small figure in the site's style: the logo's keyline strokes, a jade gi, a black belt, two
  expressions. It's decorative in the panel (`aria-hidden`, since the speech bubble carries the words),
  and drawn to work in light and dark themes through the tokens.
- Final lines for each step, the welcome, the farewell and the skip confirmation: firm but kind, one or
  two sentences, natural for beginners and developers.

**Verify:** a preview of both expressions and every line in both themes, screenshotted from a throwaway
page in the scratchpad (not added to the app).
**STOP for the owner's review of the sensei and the lines** before Task 4.

## Task 4. Panel, pointers and refresh

**Files:**
- new `components/quest/quest-panel.tsx` and `components/quest/quest-pointer.tsx`;
- `app/(app)/layout.tsx`;
- `components/lesson/code-block.tsx` (mark the Run button, send `run-code` after a run);
- `components/lesson/lesson-workspace.tsx` (mark the toggle, send `scratchpad` after a scratchpad run);
- `app/(app)/exercises/[id]/_components/exercise-client.tsx` (mark Run tests, send `pylearn:quest` after
  a submit);
- `components/lesson/lesson-complete-button.tsx` (send `pylearn:quest`).

**Change:**
- **The panel:**
  - **Desktop:** a card bottom-right, with the sensei and speech bubble, the five steps and ticks, a
    progress bar, **Show me** or **Go there**, minimise, and **Skip the quest** (with a confirm).
  - **Minimised:** the pill ("Quest 2 of 5"). It minimises itself when an editor has focus; the state is
    kept per device in localStorage.
  - **Phones:** the pill, then a bottom sheet, moving aside while the scratchpad pane is open.
  - **Updates:** it reloads on route change and on `pylearn:quest`; on `pylearn:quest-action` it posts the
    step if the quest is active and the step isn't done.
  - **Announcements:** step changes go to a polite live region.
- **Pointers:** for the current step, find `[data-quest-target=…]` on the page and draw a ring and a text
  label beside it. They follow the element (resize/scroll observers), and pulsing is off with reduced
  motion. **Show me** scrolls the target into view and focuses it.

**Verify:** a browser run of steps 1 to 4 on a lesson and a drill page; axe on the panel and pointers in
light and dark; phone width.
**Done when:** steps 1 to 4 tick live in the browser.

## Task 5. Dashboard: step 5, offer and resume

**Files:** `app/(app)/dashboard/page.tsx` (`data-quest-target` on the rank card, streak and XP), the panel
(the step 5 sequence and **Got it**), and new `components/quest/quest-offer.tsx` (the offer card and the
resume card).

**Change:**
- **Step 5:** the panel points at the belt, the streak and the XP in turn; **Got it** posts `progress`.
- **The offer:** for learners with no quest row, a **New: a 15-minute guided quest** card with **Start**
  (start, then seed from history) and **No thanks** (skip).
- **Resume:** for a skipped quest with at least one step, **Resume your quest**.

**Verify:**
- Integration covers the offer and resume rules.
- Browser: an existing account sees the offer; Start shows the panel with steps 3 and 4 pre-ticked where
  their history allows.

## Task 6. The farewell

**Files:** new `components/quest/quest-farewell.tsx`; the panel shows it when the quest goes from
unfinished to finished.

**Change:** a dialog in the style of the white belt ceremony. It has the pleased sensei, the Ready to
Train seal, +50 XP, **Finish lesson 1** (the path's lesson 1) and **Back to the dashboard**. Confetti is
skipped with reduced motion. It shows once.

## Task 7. End-to-end and wrap-up

1. Browser run-throughs with throwaway accounts (deleted afterwards), on a production build with email off:
   - a beginner does all five steps for real, through to the farewell and the badge;
   - the same as a developer;
   - skip, then resume;
   - an existing learner's offer.
2. Phone width: the pill and the sheet don't cover the editor or the scratchpad pane.
3. axe, light and dark: the panel, the pointers, the dashboard tour, the offer card and the farewell.
4. Full suites: unit, integration, python, `content:validate`, typecheck, lint.
5. Docs and memory:
   - ARCHITECTURE.md: the M8 part 2 status and the milestone row;
   - CONTENT.md: the `quest` criterion;
   - project memory.

## Order and checkpoints

Tasks 1 → 2 → 3 → **owner reviews the sensei** → 4 → 5 → 6 → 7.
