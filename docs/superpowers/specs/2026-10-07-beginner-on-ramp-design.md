# Beginner on-ramp: design

Status: approved design, awaiting spec review · Date: 2026-10-07 · Owner: Raza Awan
Part 1 of milestone M8 ([ARCHITECTURE.md §12 and §16](../../ARCHITECTURE.md#16-decisions-2026-10-07-a-course-for-everyone)).

## Why

pylearn is widening from developers to everyone: people who have never programmed, students (16 and
over) and developers. Retention depends on a new learner getting early wins and never hitting a wall.
Today a learner who picks "New to programming" in onboarding is sent to module 1, "Python for
developers", which assumes they already know what a variable, an `if`, a terminal or a build step is.

The on-ramp is a short, plain-language module that takes a complete beginner to the point where
module 1 feels like a review. It never blocks anyone and never changes a kyu grade.

## What the owner decided

| Question | Decision |
|----------|----------|
| How to serve people who have never programmed | A beginner on-ramp before module 1 (not a rewrite of module 1, not explanation only) |
| Size | About 4 hours: 6 lessons |
| Who takes it, and does it gate module 1 | Recommended start for "New to programming", open to anyone, **never a gate** |
| Youngest learner | **16 and over**, confirmed at sign-up |
| Where it lives | **A separate Start track** (option A), not module 0 of the Python track or prelude lessons in module 1 |
| Incentives | Tying the white belt, badges along the way, momentum nudges (not a shareable card) |

## Goals and non-goals

Goals:
- A complete beginner finishes the on-ramp able to start module 1 without a wall.
- Rewards arrive early and often: about every 40 minutes, and a ceremony at the end.
- Developers lose nothing: no extra clicks, no gating, no change to their rank.

Non-goals:
- Files, lists in depth, dictionaries, classes and modules (module 1 onward covers them).
- A grade, a checkpoint or a capstone project for the on-ramp.
- The first-session quest and the landing page walkthrough (M8 parts 2 and 3; see "Later parts").
- A shareable "ready" card (considered, not chosen).

## 1. Content

**Name:** "Start here: programming from zero", the only module of a new **Start** track, shown first in
the syllabus as *Before the white belt*.

**Six lessons** (about 40 minutes each, drills included):

| # | Lesson | Covers | Ends with |
|---|--------|--------|-----------|
| 1 | What a program is | Instructions run top to bottom, pressing Run, `print`, mistakes are normal, reading an error message | A first program that prints a short receipt |
| 2 | Values and names | Numbers and text, a name is a label for a value, what `=` means, changing a value | A running total kept in a name |
| 3 | Working with text and numbers | Arithmetic, joining text, f-strings, `input()`, turning an answer into a number | A program that asks for a price and a quantity |
| 4 | Making decisions | Comparisons, `if` / `elif` / `else`, `and` / `or` | A ticket-price rule (child, adult, senior) |
| 5 | Repeating things | `for` over a range or a list, building up a total, `while` with a clear stop | A times table and a countdown |
| 6 | Your first function | `def`, inputs, `return`, why functions exist | The finale: a number-guessing game, as a normal program drill |

**How it's written:**
- Plain language for adults and students 16 and over. Every technical word is defined where it first
  appears; nothing assumes earlier programming or points ahead to later modules.
- Everyday examples (shopping, a bill, a game, a ticket), never developer ones (APIs, servers, build tools).
- Every idea is practised in the browser right away: 5 to 8 drills per lesson using the existing types
  (predict, fix, function, program), mostly warm-up difficulty, with generous hints and friendly test
  messages.
- **Every lesson has one read-the-error drill:** a broken program whose error message the learner reads
  and fixes.
- Same lesson format as the rest of the course (runnable examples, the scratchpad), following
  [CONTENT.md](../../CONTENT.md) and the teaching rules in [CURRICULUM.md](../../CURRICULUM.md).
- Lesson 1's first runnable example and first drill stay short and self-contained, so the first-session
  quest (part 2) can point at them.
- The finale is testable: the hint logic is a function, `hint(secret, guess)` returning `"higher"`,
  `"lower"` or `"correct"`, tested directly; the game loop around it is run with fixed inputs and a
  fixed secret number.

**Finished means** all six lessons complete. A module's checkpoint pool defaults to every core and stretch
drill, so a track with `grade: none` has no checkpoint by rule (in `lib/curriculum-state.ts` and in
`lib/checkpoint.ts`, which starts checkpoints); the existing rule that a module without a checkpoint is
passed when its lessons are complete then applies.

## 2. The Start track in the data and the code

**Content files:**
- `content/tracks/start/track.yaml`: `slug: start`, `title: Start here`, `order: 0`, `grade: none`, and a
  one-line summary.
- `content/tracks/start/01-programming-from-zero/`: `module.yaml` (no checkpoint pool, `hours: 4`), six
  lessons and their drills.

**Code changes:**
- `lib/content/schema.ts`: `trackSchema.grade` accepts `"none"` as well as `"kyu"` and `"dan"`, and
  `trackSchema.order` accepts 0 (it requires 1 or more today), so Start sorts before Python (1) and
  Automation (2) without renumbering them. `Track.grade` and `Track.order` are already plain columns,
  so there is **no migration for this**.
- `lib/curriculum-state.ts`: `TrackProgress.grade` becomes `"kyu" | "dan" | "none"`, and the mapping
  that turns every non-`dan` grade into `kyu` keeps `none`. `lib/skill-map.ts` follows the same type.
- Pages that list every track get a "no grade" case:
  - `/modules`: the Start track first, headed *Before the white belt*, with no kyu numbers;
  - `/modules/[id]`: no rank header for a `none` track (today it checks `grade === "dan"`);
  - the skill map: labels the module "Start" instead of a number.

**Unchanged, and why:**
- Unlocking is sequential within a track, so the Start track can't lock Python's module 1.
- Rank, the black belt, pacing, the learning log and the dashboard syllabus find the Python track by
  slug (`PYTHON_TRACK`), so no kyu grade or hour estimate changes.
- The automation track's gate counts Python modules passed, not modules in general.
- Drills, the scratchpad, search, the tutor, drafts and server grading don't depend on the track.

## 3. Incentives (nothing here changes kyu grades)

**Tie the white belt.**
- A new `BeltTying` component: a belt drawn with six knots, one per on-ramp lesson, filled as lessons
  are completed. It appears on the dashboard's on-ramp card and at the top of the on-ramp's module page.
- Completing lesson 6 earns **White Belt Tied**. The lesson-complete response already returns newly
  unlocked achievements; when it includes `white-belt-tied`, the page plays a one-time ceremony ("Your
  white belt is tied", the existing seal and confetti, the achievement's XP as the bonus) with one
  button to module 1. Because it hangs off the achievement being newly unlocked, it can't repeat.

**Badges along the way** (content/achievements.yaml, synced like the rest):

| Slug | Name | Earned for | Tier | XP |
|------|------|-----------|------|----|
| `hello-world` | Hello, World | 1 on-ramp lesson complete | bronze | 10 |
| `bug-squasher` | Bug Squasher | 1 fix drill passed, anywhere | bronze | 10 |
| `decision-maker` | Decision Maker | 4 on-ramp lessons complete | bronze | 15 |
| `in-the-loop` | In the Loop | 5 on-ramp lessons complete | bronze | 15 |
| `white-belt-tied` | White Belt Tied | all 6 on-ramp lessons complete | silver | 50 |

These need two new achievement criteria, in `lib/content/schema.ts` and `lib/achievements.ts`:
- `module-lessons { module: <slug>, count }`: at least `count` lessons of that module completed;
- `drill-type { type: <exercise type>, count }`: at least `count` distinct passed drills of that type.

"Hello, World" arrives together with the existing "First Steps" (first lesson anywhere); that's fine. The
fix-drill badge is "Bug Squasher", because "Bug Hunter" is already the module 7 capstone's badge.

**Momentum nudges.**
- While the on-ramp is in progress, the dashboard's top card states what's left ("Lesson 3 of 6, about
  40 minutes"), from the lessons' `minutes`, with a Continue button to the next unfinished lesson.
- A "3 days in a row" goal beside the existing streak counter, worded as encouragement. Missing a day
  resets it with no guilt message.

## 4. Getting there, and the age check

**Onboarding.** "New to programming" reads: *"Start with Start here, a 4-hour on-ramp in plain language,
then module 1."* Finishing onboarding with that choice goes to the on-ramp's module page; other choices
go to the dashboard as today.

**Dashboard.** The on-ramp card shows for anyone who has started the on-ramp, or chose "New to
programming", until they finish it. After the ceremony it's gone and the usual next-module view takes
over at module 1. Developers who never open the on-ramp never see it.

**Syllabus.** The Start track is first. For learners who didn't choose "New to programming" it carries
the note *"Never programmed? Start here; it's optional."* Module 1 stays unlocked for everyone.

**Age check (16 and over).**
- Sign-up form: a required checkbox, *"I'm 16 or older"*, also validated in `/api/auth/register`.
- Onboarding: the same question for any account that didn't come through the sign-up form (GitHub or
  Google sign-in, if enabled later).
- Stored as `User.ageConfirmedAt` (nullable timestamp): **the one migration**.
- "I'm under 16" gets a friendly explanation. At sign-up no account is created; in onboarding the page
  offers to delete the account.
- The privacy page says pylearn is for people 16 and over.

## 5. Writing process

- Each lesson follows CONTENT.md and the teaching rules, plus a beginner checklist: every technical word
  defined where first used, no reference to later modules or outside knowledge, everyday examples, one
  read-the-error drill.
- `content:validate` must pass: every drill's solution passes and its starter fails.
- **Owner checkpoint:** lesson 1 is written first and reviewed by the owner before the others, to set the
  tone. Lessons 2 to 6 can then be drafted in parallel and are reviewed against the same checklist.

## 6. Build order

1. Foundations: `grade: none` in the schema and code, the "no grade" page cases, the two achievement
   criteria, `ageConfirmedAt` with the sign-up and onboarding checks. Tests for each.
2. Lesson 1, validated, then **paused for owner review**.
3. Lessons 2 to 6, validated.
4. Incentives: `BeltTying`, the dashboard card, the five achievements, the ceremony.
5. Routing: the onboarding hand-off, the syllabus note, the new "New to programming" wording.
6. End-to-end: `content:sync`, then a run-through as a new test account (sign up, onboarding, the
   on-ramp, the ceremony, module 1), axe on the new pages, and the full test suites.

## 7. Testing

- **Unit:**
  - The content tree loads with 3 tracks and 25 modules (update the current test).
  - `grade: none` passes the schema.
  - The two new achievement criteria.
  - The "what's left" estimate.
- **Integration:**
  - Finishing the on-ramp leaves the learner at 16 kyu, with module 1 unlocked throughout.
  - The five badges arrive at the right points.
  - Registering without the age box is refused.
  - "New to programming" onboarding routes to the on-ramp.
  - The dashboard card shows during the on-ramp and disappears after.
  - A developer never sees it.
- **Content:** `content:validate` on every new drill.
- **Browser:** the end-to-end run-through and an axe scan (light and dark) of the on-ramp module page, a
  lesson, the dashboard with the card, and the ceremony.

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Lessons pitched too high or too low | Owner reviews lesson 1 before the rest; the beginner checklist |
| A page assumes every track has a kyu or dan grade | Known cases listed in §2; the end-to-end run-through catches the rest |
| Beginners skip the on-ramp and hit module 1 | It's their recommended start and the dashboard keeps it in front of them; it stays optional by decision |
| Age self-declaration can be false | Accepted: a confirmed declaration is the standard approach; the timestamp records it |

## Later parts (not in this spec)

- **Part 2, the first-session quest:** a game-style first session after onboarding on the real app.
  It starts from each learner's starting point (this on-ramp's lesson 1, or module 1).
- **Part 3, "How it works" on the landing page:** a hands-on walkthrough of one learner's journey, "Who
  it's for" and an FAQ, describing the finished experience including this on-ramp.
