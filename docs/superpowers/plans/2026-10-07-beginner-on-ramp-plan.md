# Beginner on-ramp: implementation plan

Spec: [2026-10-07-beginner-on-ramp-design.md](../specs/2026-10-07-beginner-on-ramp-design.md) · Date: 2026-10-07

Ten tasks in the spec's build order. Each lists the files it touches, the tests written first where
the behaviour can be tested, how it's verified, and when it's done. Every task ends with
`npm run typecheck`, `npm run lint` and `npm test` passing. Nothing is committed by the agent: the
owner commits.

Facts from the code that shape the plan:
- Lesson and exercise slugs are unique across the whole course, so on-ramp slugs are prefixed `start-`.
- A lesson's minutes are stored as `Lesson.estimatedTime`.
- The lesson-complete request already returns newly unlocked achievements
  (`components/lesson/lesson-complete-button.tsx`).
- `lib/curriculum-state.ts` decides unlocking per track and maps any non-`dan` grade to `kyu` (line ~162).

---

## Task 1. Allow a track with no grade

**Files:** `lib/content/schema.ts`, `lib/curriculum-state.ts`, `lib/skill-map.ts`,
`components/mastery/skill-map.tsx`, `app/(app)/modules/page.tsx`, `app/(app)/modules/[id]/page.tsx`,
`tests/unit/checks.test.ts`, new `tests/unit/tracks.test.ts`.

**Tests first** (`tests/unit/tracks.test.ts`):
- `trackSchema` accepts `grade: "none"` with `order: 0`; still rejects an unknown grade and a negative order.
- A `none` track passed through the curriculum-state mapping keeps `grade: "none"`. This needs the mapping
  extracted into a small exported function, `trackGrade(raw: string)`.

**Change:**
- `trackSchema.grade`: `z.enum(["kyu", "dan", "none"])`; `trackSchema.order`: `.min(0)`.
- `TrackProgress.grade` and the skill-map type become `"kyu" | "dan" | "none"`; use `trackGrade()`.
- `/modules`: render a `none` track first under the heading *Before the white belt*, with no kyu or dan line.
- `/modules/[id]`: `grade === "none"` shows no rank header (today only `dan` is special-cased).
- Skill map: label a `none` module "Start".

**Verify:** the new unit tests; typecheck catches every place that switched on the grade.
**Done when:** a `none` track renders on `/modules`, `/modules/[id]` and the skill map without a kyu number.

## Task 2. Two new achievement criteria

**Files:** `lib/content/schema.ts` (achievement criteria union), `lib/achievements.ts`, new
`tests/unit/achievement-criteria.test.ts`.

**Tests first:**
- `module-lessons { module, count }` is met only when at least `count` lessons of that module are complete.
- `drill-type { type, count }` counts distinct passed drills of that type, so passing one drill twice counts once.
- The existing criteria still pass their current tests.

**Change:**
- Add both criteria to the schema's discriminated union.
- `LearnerStats` gains:
  - `lessonsByModule: Map<moduleSlug, number>`, from completed `Progress` joined to the lesson's module slug;
  - `passedByType: Map<type, number>`, from the distinct passed `exerciseSubmission`s joined to `exercise.type`.
  
  These two extra grouped queries go in the same `Promise.all`.
- `met()` handles the two new kinds.

**Verify:** unit tests; `content:validate --quick` still loads `achievements.yaml`.
**Done when:** both criteria work and are documented in the `achievements.yaml` header comment and CONTENT.md.

## Task 3. Age confirmation (16 and over)

**Files:** `prisma/schema.prisma` + new migration, `lib/validations/auth.ts`,
`app/api/auth/register/route.ts`, `app/auth/signup/_components/signup-form.tsx`,
`app/api/onboarding/route.ts`, `app/(app)/onboarding/page.tsx`, `components/onboarding/onboarding-form.tsx`,
`app/privacy/page.tsx`, `tests/integration/helpers.ts`, new `tests/integration/onramp.test.ts`.

**Tests first** (integration):
- Registering without `ageConfirmed: true` is refused with 400 and creates no user.
- Registering with it sets `ageConfirmedAt`.
- Onboarding a user whose `ageConfirmedAt` is null requires the age answer, and stores it.

**Change:**
- Migration: `User.ageConfirmedAt DateTime?`. Apply it with `prisma migrate dev`, then restart the dev
  server, which caches the Prisma client.
- `signUpSchema`: `ageConfirmed: z.literal(true, { message: "pylearn is for people 16 and over." })`.
  The register route stores `ageConfirmedAt: new Date()`.
- Sign-up form: a required checkbox, *"I'm 16 or older"*, wired through react-hook-form, with the error
  shown under it.
- Onboarding: if `ageConfirmedAt` is null, ask first. Answering under 16 shows a friendly explanation and a
  "Delete my account" button, which uses the existing `DELETE /api/settings/delete`.
- The onboarding API accepts `ageConfirmed` and refuses to finish onboarding without it when it isn't on record.
- Privacy page: one line saying pylearn is for people 16 and over.
- `makeLearner` in the test helpers sets `ageConfirmedAt`, so existing tests keep passing.

**Verify:** integration tests. In the browser, sign up without the box (refused), then with it.
**Done when:** no account can be created or onboarded without confirming 16+.

## Task 4. The Start track and lesson 1

**Files:** `content/tracks/start/track.yaml`, `content/tracks/start/01-programming-from-zero/module.yaml`,
`content/tracks/start/01-programming-from-zero/lessons/01-what-a-program-is.md`, and that lesson's drills in
`.../exercises/start-*`.

**Content:**
- `track.yaml`: `slug: start`, `title: Start here`, `grade: none`, `order: 0`, a one-line summary.
- `module.yaml`: `slug: programming-from-zero`, title "Start here: programming from zero", `hours: 4`, no
  checkpoint pool, a plain-language description and outcomes.
- **Lesson 1 "What a program is":** about 40 minutes, following the spec's beginner checklist, with 5 to 8
  drills (predict, fix, program), including one read-the-error drill. Its first runnable example and its
  first drill stay short and self-contained, for the quest in part 2.

**Verify:**
- `npm run content:validate -- --only programming-from-zero`: solutions pass and starters fail.
- Update the content-tree unit test: 3 tracks (`start`, `python`, `automation`), 25 modules.

**Done when:** lesson 1 validates. **STOP here for the owner's review of lesson 1's tone** before Task 5.

## Task 5. Lessons 2 to 6

**Files:** lessons `02-values-and-names.md` to `06-your-first-function.md` and their `start-*` drills.

**Content:** as in the spec's lesson table. Lesson 6 ends with the number-guessing game:
- `hint(secret, guess)` returns `"higher"`, `"lower"` or `"correct"`, tested directly;
- the game loop is run with fixed inputs and a fixed secret number.

Every lesson has one read-the-error drill.

**Process:** can be drafted in parallel, one sub-agent per lesson, briefed with lesson 1 as the reference
and the beginner checklist. Each draft is reviewed against the checklist before it's accepted.

**Verify:** `content:validate -- --only programming-from-zero` with every drill passing; a read-through of
each lesson against the checklist.
**Done when:** all six lessons validate and pass the checklist.

## Task 6. The on-ramp's state

**Files:** new `lib/onramp.ts`, new `tests/unit/onramp.test.ts`, integration cases in `tests/integration/onramp.test.ts`.

**Tests first:**
- Unit: `remaining(lessons)` returns the next unfinished lesson, "lesson N of 6" and the minutes left
  (the sum of `estimatedTime` for unfinished lessons).
- Integration: `getOnRamp(userId)` reports `started`, `finished`, the lessons with completion, and
  `showOnDashboard`. That's true for "New to programming" or started, and false once finished. It's false
  for a developer who never started.

**Change:** `lib/onramp.ts` exports `START_TRACK = "start"`, `remaining()` and `getOnRamp(userId)`, reading
the Start track's single module from `getCurriculumState`.

**Done when:** the tests pass.

## Task 7. Belt tying, badges and the ceremony

**Files:**
- new `components/brand/belt-tying.tsx`;
- new `components/onramp/onramp-card.tsx` and `components/onramp/white-belt-ceremony.tsx`;
- `components/lesson/lesson-complete-button.tsx`;
- the on-ramp module page (`app/(app)/modules/[id]/page.tsx`, `none` branch);
- `content/achievements.yaml`.

**Change:**
- `BeltTying`: an SVG belt with six knots, filled per completed lesson. It has an accessible text equivalent
  ("3 of 6 lessons done"), respects reduced motion, and uses the existing belt colour tokens.
- `achievements.yaml`: `hello-world`, `bug-hunter`, `decision-maker`, `in-the-loop` and `white-belt-tied`,
  with the tiers, XP and criteria in the spec.
- `WhiteBeltCeremony`: a dialog shown when the lesson-complete response's achievements include
  `white-belt-tied`. It has the seal, confetti (skipped with reduced motion), "Your white belt is tied",
  the XP and "Start module 1". Focus moves into the dialog and Escape closes it.
- Module page for the Start track: `BeltTying` above the lesson list.

**Verify:**
- Integration: completing on-ramp lessons 1, 4, 5 and 6 unlocks the matching badges, and a fix drill unlocks
  `bug-hunter`. The learner is still 16 kyu after all six lessons, with Python module 1 unlocked throughout.
- Browser: the ceremony appears once.
- axe on the module page and the ceremony.

**Done when:** the badges arrive at the right points and the ceremony shows once.

## Task 8. Dashboard card and streak goal

**Files:** `app/(app)/dashboard/page.tsx`, `components/onramp/onramp-card.tsx`.

**Change:**
- When `getOnRamp().showOnDashboard`, the top of the dashboard shows the card: `BeltTying`, "Lesson 3 of 6,
  about 40 minutes" and a Continue button to the next lesson.
- Beside the existing streak counter, a "3 days in a row" goal while the on-ramp is in progress, worded as
  encouragement.
- The usual next-module view stays as it is below the card, and becomes the top once the on-ramp is finished.

**Verify:**
- Integration: the card data appears and disappears as specified.
- Browser: the dashboard as a beginner mid-on-ramp, as a beginner who has finished, and as a developer.
- axe on the dashboard, light and dark.

**Done when:** the three dashboard states look right and pass axe.

## Task 9. Routing

**Files:** `components/onboarding/onboarding-form.tsx`, `app/api/onboarding/route.ts`, `app/(app)/modules/page.tsx`.

**Change:**
- "New to programming" detail: *"Start with Start here, a 4-hour on-ramp in plain language, then module 1."*
- The onboarding API's response includes `next`: the on-ramp module page for `experience: "new"`, otherwise
  `/dashboard`. The form navigates there.
- `/modules`: for learners who didn't choose "New to programming", the Start track carries *"Never
  programmed? Start here; it's optional."*

**Verify:** integration (onboarding with `new` returns the on-ramp page; others return `/dashboard`) and a
browser run of both paths.
**Done when:** both paths land where the spec says.

## Task 10. Sync, end-to-end run, docs

**Steps:**
1. `npm run content:sync`, then check that the Start track and the five achievements are in the database.
2. End-to-end in the browser with a new throwaway test account, deleted afterwards:
   1. sign up (the 16+ box) and onboard as "New to programming";
   2. land on the on-ramp and complete all six lessons;
   3. check that the badges arrive, the ceremony shows, and module 1 follows;
   4. confirm the account is still 16 kyu.
3. axe (light and dark) on: the on-ramp module page, a lesson, the dashboard with the card, the ceremony,
   the sign-up form and onboarding.
4. Full suites: `npm test`, `npm run test:integration`, `npm run test:python`, `npm run content:validate`.
5. Docs:
   - CONTENT.md: `grade: none` tracks and the two new achievement criteria;
   - CURRICULUM.md: the on-ramp section from "design in progress" to its lesson list;
   - ARCHITECTURE.md: an M8 part 1 status line;
   - update project memory.

**Done when:** every check above passes and the owner has the run-through report.

---

## Order and checkpoints

Tasks 1 to 3 (foundations) → Task 4 → **owner reviews lesson 1** → Task 5 alongside Tasks 6 to 8 → Task 9 → Task 10.

Tasks 6 to 8 don't depend on lessons 2 to 6 existing beyond lesson 1, so they can be built while the lessons
are written.

## Execution options

1. **Sequential in this session:** each task in order, checks between tasks, the stop after lesson 1.
2. **Parallel where safe (recommended):** foundations and lesson 1 in this session. After the review, lessons
   2 to 6 are drafted by sub-agents (one per lesson, using lesson 1 as the reference) while Tasks 6 to 8 are
   built here. Then Tasks 9 and 10.
