# First-session quest: design

Status: approved design, awaiting spec review · Date: 2026-10-07 · Owner: Raza Awan
Part 2 of milestone M8 ([ARCHITECTURE.md §12 and §16](../../ARCHITECTURE.md#16-decisions-2026-10-07-a-course-for-everyone)).
Builds on part 1, the beginner on-ramp ([its spec](2026-10-07-beginner-on-ramp-design.md)).

## Why

Retention depends on a new learner understanding the app at once and getting a first success in their
first session. Today a new learner finishes onboarding and lands on a dashboard (or, for beginners, the
on-ramp) with no guidance. The quest is a game-style tutorial level on the real app: a sensei walks the
learner through five real actions in about 15 minutes, and rewards them at the end.

## What the owner decided

| Question | Decision |
|----------|----------|
| Format | A first-session quest of real actions, not a tooltip tour |
| Size | About 15 minutes, 5 steps |
| Guide | A sensei character |
| Who and control | Automatic for new learners after onboarding, always skippable and resumable; existing learners can start it once from the dashboard |
| Approach | A small quest system of our own (option A), not a tour library or browser-only state |
| Step 4 | "Fix your first bug", replacing "Finish lesson 1" (a lesson needs all its drills, about 40 minutes) |
| Reward | The **Ready to Train** badge (silver, 50 XP) and the sensei's farewell |

## Goals and non-goals

Goals:
- Every new learner, beginner or developer, does five real things in their first session and knows where
  everything is.
- Progress is saved on the server: it resumes on any device and the reward can't be faked.
- Nothing is ever blocked: the quest guides, it doesn't gate.

Non-goals:
- More quests (the data model allows them; none are planned).
- Changing rank, gating lessons or modules.
- The landing-page walkthrough (M8 part 3).
- The AI tutor's "Thinking…" state (separate backlog item).

## 1. The steps and the sensei

The quest happens in the learner's first lesson: the on-ramp's "What a program is"
(`start-what-a-program-is`) for learners who chose "New to programming", module 1's "Running Python"
(`running-python`) for everyone else.

| # | Key | Step | Done when | Sensei (draft) |
|---|-----|------|-----------|----------------|
| 1 | `run-code` | Run your first code | Run is pressed on an example in any lesson | "Welcome to the mat. Every lesson has code you can run. Press Run and see what happens." |
| 2 | `scratchpad` | Try the scratchpad | Code is run in the lesson scratchpad | "This is your scratchpad: a space to try your own ideas while you read. Change something and run it." |
| 3 | `first-drill` | Pass your first drill | Any drill passes | "Drills are where you practise. Read the task, write the code, press Run tests. Use a hint if you're stuck." |
| 4 | `fix-bug` | Fix your first bug | A `fix` drill passes, or the path's designated bug drill (`start-fix-the-missing-quote` for beginners, `fix-the-indentation` for developers) | "Mistakes are part of training. Read the error from the bottom up, then fix it." |
| 5 | `progress` | See your progress | "Got it" is pressed after the dashboard pointers (belt, streak, XP) | "This is your record: belt, stripes, streak. Come back tomorrow and the streak grows." |

- Steps count in any order; the panel highlights the first one not done.
- The sensei is firm but kind, never sarcastic, one or two sentences per line, written to read naturally
  for a beginner and a developer. The final lines are written in build step 3 and reviewed by the owner.
  (Done 2026-10-07: the approved lines are in `lib/quest-steps.ts`, `STEPS` and `SENSEI`.)
- Finishing: the farewell, **Ready to Train**, and the next step, "Finish the rest of lesson 1".

## 2. Data and events

**`QuestProgress`** (new table, one migration): `userId`, `quest` (`"first-session"`), `completed`
(string array of step keys), `startedAt`, `finishedAt?`, `skippedAt?`; unique on (`userId`, `quest`);
cascades with the user. Whether the panel is minimised is per device, in the browser.

**Events:**

| Step | Source |
|------|--------|
| `run-code`, `scratchpad`, `progress` | The browser: `POST /api/quest/event { step }`. Only these three keys are accepted, only while the learner's quest is active (started, not finished, not skipped), rate-limited |
| `first-drill`, `fix-bug` | The server, wherever a drill pass is recorded: `app/api/progress/exercise/route.ts`, and `app/api/exercises/[id]/submit/route.ts` (server grading, `GRADING_MODE=server`) |

The browser-reported steps only tick boxes; the two steps that matter for the reward are checked on the
server.

**`lib/quest.ts`** owns the quest:
- the step definitions (key, title, sensei line, the pointer target);
- `getQuest(userId)`: the state for the panel (steps with done flags and path-aware links, the current
  step, `active`, `finished`, `skipped`);
- `recordStep(userId, key)`: adds a step and, when all five are done, sets `finishedAt` and runs the
  achievement check;
- `startQuest`, `skipQuest`, `resumeQuest`;
- `seedFromHistory`: on start, ticks `first-drill` and `fix-bug` from drills already passed.

**API:**
- `GET /api/quest`
- `POST /api/quest/event`
- `POST /api/quest/start`
- `POST /api/quest/skip`
- `POST /api/quest/resume`

All are signed-in only.

**Starting:**
- First-time onboarding (`saveOnboarding`) starts the quest.
- Existing learners start it from the dashboard offer.

**Reward:** a new achievement criterion, `quest { quest }`, met when that quest has `finishedAt`, and the
achievement `ready-to-train` (Ready to Train, silver, 50 XP), so the usual engine awards it once.

## 3. On screen

**Quest panel** (client component in the signed-in layout, shown while the quest is active):
- **Desktop:** a compact card, about 320px, in the bottom-right corner. It holds:
  - the sensei and a speech bubble with the current step's line;
  - the five steps with ticks, and a progress bar;
  - **Show me** (scroll to and point at the target on this page) or **Go there** (a link when the target
    is elsewhere);
  - minimise;
  - **Skip the quest**, with a confirm.
- **Minimised:** a pill with the sensei's head and "Quest 2 of 5". It minimises itself while the learner
  types in an editor.
- **Phones:** it starts as the pill above the bottom edge and opens as a bottom sheet, moving aside while
  the scratchpad's bottom pane is open.
- **Refresh:**
  - it reloads its state from `GET /api/quest` on each page change;
  - it also reloads on an in-browser `pylearn:quest` event, which the drill page and the lesson-complete
    button send after their requests return.

**Pointers:**
- A pulsing ring and a short text label around the real control, for the current step only.
- Targets are marked in the code: `data-quest-target="run-example"`, `"scratchpad"`, `"run-tests"`, and
  the dashboard's `"belt"`, `"streak"`, `"xp"`.
- No dimmed overlay, no focus trap, no scrolling unless **Show me** is pressed.
- On the dashboard, step 5 points at the belt, the streak and the XP in turn, then shows **Got it**.

**The sensei:** a small SVG figure in the site's style (the logo's keyline strokes, a jade gi, a black
belt), with two expressions: calm for steps, pleased for the farewell.

**Farewell:** a dialog in the style of the white belt ceremony. It has the pleased sensei, the Ready to
Train seal, +50 XP, **Finish lesson 1** and **Back to the dashboard**. It shows once, when the panel sees
the quest go from unfinished to finished.

**Accessibility:**
- The panel is a labelled region ("Quest"), reachable by keyboard; Escape minimises it.
- Step changes are announced in a polite live region ("Step 2 of 5 done: Try the scratchpad").
- Pointers carry real text, not only a ring.
- Reduced motion turns off pulsing and confetti.
- All colours come from theme tokens.

## 4. Skipping, resuming and existing learners

- **Skip:** "Skip the quest? You can pick it up again from the dashboard." Confirming sets `skippedAt`
  and hides the panel.
- **Resume:** if skipped with at least one step done, the dashboard shows **Resume your quest**. Resuming
  clears `skippedAt` and keeps the steps.
- **Existing learners** (no quest row, onboarded before release) see a dashboard card, **New: a 15-minute
  guided quest**, with **Start** and **No thanks**.
  - **No thanks** records a skip with no steps, so neither card shows again.
  - **Start** seeds steps 3 and 4 from their history; steps 1, 2 and 5, the tour, are always fresh.
- **Changing "New to programming" mid-quest** repoints the step links on the next refresh.
- **On-ramp beginners** see the quest panel and the on-ramp card together; both point at the same lesson 1.

## 5. Build order

1. **Foundations:**
   - `QuestProgress` and its migration;
   - `lib/quest.ts`;
   - the `quest` achievement criterion and `ready-to-train`.
2. **API and hooks:**
   - the quest routes;
   - starting the quest in first-time onboarding;
   - ticking steps 3 and 4 where drill passes are recorded.
3. **The sensei:** SVG (calm and pleased) and every line. **Stop for owner review.**
4. **Panel, pointers, refresh:** the panel, the pointers, the `data-quest-target` marks and the refresh event.
5. **Dashboard:** step 5's pointers and **Got it**, the offer card, and the resume card.
6. **The farewell dialog.**
7. **End-to-end and wrap-up:** the run-throughs, docs and memory.

## 6. Testing

- **Unit:**
  - The current step and path-aware links for a beginner and a developer.
  - Steps in any order.
  - The `quest` criterion.
- **Integration:**
  - First onboarding starts the quest.
  - The event endpoint accepts only the three browser steps, and only while active.
  - A drill pass ticks `first-drill`; a fix drill, or the path's bug drill, ticks `fix-bug`.
  - Finishing awards Ready to Train exactly once.
  - Skip and resume keep steps.
  - "No thanks" ends the offer.
  - Starting seeds history.
- **Browser** (throwaway accounts, deleted afterwards):
  - All five steps for real, as a beginner and as a developer, through to the farewell and the badge.
  - Skip and resume.
  - An existing learner's offer.
  - Phone width (pill and sheet).
  - axe, light and dark, on the panel, pointers, the dashboard tour and the farewell.
- **Full suites:** unit, integration, python, `content:validate`, typecheck, lint.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| The panel covers working space | Minimises itself while typing; moves aside for the scratchpad pane; checked at phone width |
| Pointers lose their target when a layout changes | Explicit `data-quest-target` marks; the run-through checks each one |
| The sensei misses the tone | Owner review in build step 3 |
| A drill pass recorded somewhere not hooked | Both recording paths (progress API, server grading) are listed and tested |
