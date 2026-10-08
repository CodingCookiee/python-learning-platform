# Landing page "How it works": design

Status: built 2026-10-08 (see section 10 for what changed during the build) · Date: 2026-10-08 · Owner: Raza Awan
Part 3 of milestone M8 ([ARCHITECTURE.md §12 and §16](../../ARCHITECTURE.md#16-decisions-2026-10-07-a-course-for-everyone)).
Builds on part 1, the beginner on-ramp ([spec](2026-10-07-beginner-on-ramp-design.md)), and part 2,
the first-session quest ([spec](2026-10-07-first-session-quest-design.md)).

## Why

pylearn is now for everyone, but its landing page still speaks to developers: "A graded path for
developers", and a hands-on drill that asks a visitor to write a function. Someone who has never coded
can't tell the site is for them, and nobody can see the whole path (lessons to the black belt and the
AI grades) or what it costs. The page should let any visitor try the core loop in a few minutes, show the
whole path, say who it's for, and answer cost, time and what you need, honestly.

## What the owner decided

| Question | Decision |
|----------|----------|
| Hero | Keep the title "Earn your black belt in Python."; widen the line under it to everyone; two ways in, **I've never coded** and **I already code** |
| Cost | Free. The optional AI tutor and reviewer use the learner's own Anthropic, OpenAI or Google key |
| The journey | **"Try the first 3 minutes"**: a sandbox runs a real micro-lesson, a fix and a stripe in sequence, then a short static list explains the rest of the path |
| Where the sandbox lives | It **replaces the hero's live drill** (the `greet()` function). "How it works" below becomes the path list, then "Who it's for" and an FAQ |

## Goals and non-goals

Goals:
- A visitor who has never coded runs a line of Python, fixes a bug and earns a stripe within three
  minutes of arriving, with no account.
- Every visitor can see the whole path, who it's for, what it costs, how long it takes and what they need.
- The visitor's answer to "have you coded before?" carries into onboarding.
- All the new words are plain text in the page (search engines, screen readers), and the FAQ is also
  structured data.

Non-goals:
- No video, no carousel, no account-less progress saved anywhere.
- No change to the syllabus, JavaScript-to-Python or record sections beyond moving them.
- No pricing page: cost is one FAQ answer.

## 1. The hero and the sandbox

**Left side** (`components/landing/hero.tsx`):
- Title (unchanged): "Earn your black belt in Python."
- Line: "From your very first line of code to advanced Python, then AI automation: one graded step at a
  time, in your browser. Free, nothing to install, no experience needed."
- Two ways in (section 5): **I've never coded →** (primary) and **I already code →** (secondary).
- Stat line: "{modules} modules · {lessons} lessons · free · Python runs in your browser".

**Right side: the sandbox** (new `components/landing/try-it.tsx`, replacing `live-drill.tsx`). A frame
headed "Try it" with three steps, dots and Back/Next. The sensei's head and one line guide each step.

| # | Step | What happens | Sensei (draft, for owner review) |
|---|------|--------------|----------------------------------|
| 1 | Run a line | `print("Hello!")` is shown; **Run** prints `Hello!` underneath | "Press Run. The computer does exactly what the line says." |
| 2 | Fix a bug | `print("Welcome to the café!)` in a plain text box. **Run** shows Python's real error (the last line of the traceback). The visitor adds the missing quote and presses **Run tests**: one test, "prints `Welcome to the café!`" | "This line has a bug: a quote is missing. Read the error, fix it, run the tests." |
| 3 | Earn a stripe | On a pass, the belt ladder under the hero presses on a stripe ("Stripe earned", the existing animation) and the frame shows "Make it count" with **Sign up free** | "That's a stripe. Here you earn rank by passing, not by clicking next." |

Behaviour:
- Steps 1 and 2 can be done in either order; step 3 follows the pass. **Reset** puts step 2's code back.
- A plain `<textarea>` (monospace, no Monaco) keeps the page light. Ctrl/Cmd+Enter runs.
- **Loading:** Python starts downloading when the visitor first points at, taps or tabs into the frame
  (the current drill waits for the first Run); the page never waits for it. While it loads, Run reads
  "Loading Python…" with a note that the first run takes a few seconds.
- **If Python can't load** (offline, blocked): the frame shows the expected output for step 1 and the
  error and fixed output for step 2 as text, says plainly that Python couldn't start here, and still
  offers **Sign up free**.
- **Checking** is a pure function (`lib/landing/try-it.ts`): the fix passes when the program runs
  without an error and prints exactly `Welcome to the café!`. The error shown is the traceback's last line.
- **Accessibility:** a labelled region; results in a polite live region; the dots are buttons with
  "Step n of 3" names and `aria-current`; no motion with reduced motion (the stripe appears without the
  press).
- The sensei's head uses the quest's `Sensei` component (`head`), decorative; the line is the text.

## 2. How it works

Replaces today's "Rank is earned, not clicked." section, straight after the hero. Heading "How it
works", that line as its subheading, and an opening line: "You've just done the first three steps.
Here's the whole path." Seven numbered stops along one belt line:

| # | Stop | Text |
|---|------|------|
| 1 | Lessons | Short reads with examples you run in place. Never coded? Start with a 4-hour on-ramp in plain language. |
| 2 | Drills | Exercises checked by real tests. Hints are there when you're stuck; the optional AI tutor asks questions rather than giving you answers. |
| 3 | Gradings | Every module ends with one: no hints, 80% to pass. Pass it and a stripe goes on your belt. Already know the topic? Take the grading first and test out. |
| 4 | Belts | Stripes fill a belt, and a full belt promotes you: white, yellow, green, blue, brown. Skills you haven't used in a while fade; a short daily review keeps them. |
| 5 | Capstones | Real projects you build on your own computer and push to GitHub, where tests check them. |
| 6 | Black belt | All 16 gradings passed, the advanced topics kept strong through review, and three capstones approved. Rank can't be ground out with XP: it only moves when you pass. |
| 7 | AI automation | Eight more modules after the black belt, the dan grades: LLM APIs, agents, RAG, MCP, n8n and running it all in production. |

Layout: on wide screens stops 1–3 in a row, each tagged "You just tried this", with the grading's seal
kept; stops 4–7 in a second row (the fading-stripe picture stays with Belts). One column on phones.

## 3. Who it's for

After "How it works". Three cards side by side, stacked on phones:

| Card | Text | Button |
|------|------|--------|
| Never coded before | Start with *Start here*, a 4-hour on-ramp in plain language. Every word is explained the first time it comes up, every example runs in your browser, and tying your white belt leads you into module 1. | **I've never coded →** |
| Students | A clear path with gradings like exams, a record you can show (belts, seals, and capstones on your GitHub), and it's free. Set the hours you have each week, and the dashboard plans your finish date. | **Start free →** |
| Developers | Test out of what you know with each module's grading. If you come from JavaScript, side notes put Python next to the code you already write. Then go deep: the data model, concurrency, FastAPI, then AI automation. | **I already code →**, and a link to the JavaScript-to-Python section |

Under the cards: "pylearn is for people 16 and over."

## 4. FAQ

Before the closing call to action. Native `<details>`/`<summary>` (no JavaScript, keyboard-ready):

| Question | Answer |
|----------|--------|
| What does it cost? | Nothing. Lessons, drills, gradings, belts and capstone checks are all free. The AI tutor and reviewer are optional: they use your own Anthropic, OpenAI or Google key, so you pay that provider directly for what you use, and pylearn never bills you. |
| How long does it take? | Start here, the on-ramp, takes about 4 hours. White belt to black belt is about 133 hours of training, roughly six months at 5 hours a week. The AI automation grades add about 84 hours. Tell the dashboard your weekly hours and it shows your finish date. |
| What do I need? | A browser. Lessons, drills and gradings all run in it, with nothing to install, though a laptop is easier than a phone for longer drills. For capstones you'll install Python on your own computer (module 1 shows you how) and use a free GitHub account. |
| Is a belt a qualification? | No. Belts and seals are pylearn's own record of what you've passed, not an accredited certificate. Your capstones are real projects on your GitHub that anyone can look at, and that's what shows your skill. |
| Who can join? | Anyone 16 or over. Your progress is private to your account; see the privacy policy for exactly what's kept. |

The hours come from the modules' `hours` (4, 133 and 84 today); the page computes them from the database
like the stat line, so they stay true as content changes. The same questions and answers are emitted as
`FAQPage` JSON-LD.

## 5. Ways in

- **I've never coded** links to `/auth/signup?start=new`; **I already code**, **Start free** and the
  sandbox's **Sign up free** link to `/auth/signup`.
- The sign-up form remembers `start=new` in the browser (`localStorage`, key `pylearn:start`), which
  also covers Google and GitHub sign-up.
- Onboarding pre-selects "New to programming" when the learner hasn't answered yet and `pylearn:start`
  is `new`. The learner can change it. The key is cleared after onboarding is saved.
- **I already code** pre-selects nothing: onboarding has two developer answers ("I code in another
  language", "I already write Python"), and both lead to module 1.
- Signed-in visitors never see the landing page (it redirects to the dashboard), so none of this applies
  to them.

## 6. The rest of the page

- **Order:** hero (sandbox) → How it works → Who it's for → syllabus → JavaScript to Python → your record →
  FAQ → close.
- **Close:** "Tie on the white belt." with the two ways in, and "I already have an account".
- **`/llms.txt`:** "takes developers" becomes "takes anyone, from their first line of code"; add that it's
  free and that the AI features use the learner's own key.
- **Site description** (`app/layout.tsx`): add "Free, no experience needed."

## 7. Build order

1. **Sandbox logic:** `lib/landing/try-it.ts` (the check and the error line), unit tests first.
2. **The sandbox:** `components/landing/try-it.tsx`, wired to the belt ladder; the hero's new copy and
   ways in. **Stop for owner review of the sensei's three lines and the sandbox.**
3. **How it works, Who it's for, the FAQ** (with hours from the database and the JSON-LD), page order,
   close.
4. **Ways in:** the sign-up form remembers `start`; onboarding pre-selects; cleared on save.
5. **`/llms.txt`, the site description, docs** (ARCHITECTURE.md M8 part 3 done), memory.
6. **End-to-end:** a production build; the sandbox's three steps for real; the Python-can't-load
   fallback; each way in through sign-up to onboarding's pre-selection; phone width; axe light and dark.

## 8. Testing

- **Unit:** the fix check (passes, wrong text, error, extra output); the error's last line; FAQ hours
  formatting from module hours.
- **Integration:** the hours query returns the on-ramp's, the Python track's and the automation track's
  totals from the synced content (4, 133 and 84 today).
- **Browser** (throwaway accounts, deleted afterwards):
  - the sandbox: run, the real error, the fix, the pass, the stripe on the belt ladder, Back/Next and
    keyboard use;
  - Python blocked: the fallback text and the sign-up button;
  - **I've never coded** → sign-up → onboarding with "New to programming" pre-selected; **I already
    code** → nothing pre-selected;
  - phone width; axe in light and dark on the whole page.
- **Full suites:** unit, integration, python, typecheck, lint.

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Pyodide is a large download on a landing page | Starts on first interaction only; the page never waits; the fallback covers failures |
| The sandbox feels like a toy to developers | It's the first three steps of the real loop, and the developer card and the JavaScript section sit just below |
| FAQ numbers drift from the content | Hours are computed from the modules' `hours` at render time |
| A remembered "never coded" surprises someone who changes their mind | It only pre-selects; one click changes it, and it's cleared after onboarding |
| The sensei's sandbox lines miss the tone | Owner review in build step 2 |

## 10. Changes made during the build

Found while building and checking the page; each keeps to the approved design.

| Change | Why |
|--------|-----|
| The site header and mobile menu link **How it works**, **Syllabus**, **For JS developers** and **Questions** (in page order) | Their "How rank is earned" link pointed at `#rank`, the section How it works replaced |
| Signed-out sign-up buttons read **Start free** (landing header, app navbar, mobile menu), not "Start at white belt" | One message across the site: it's free |
| Step 3's sensei line, when Python couldn't run and no stripe was earned, is the approved line's second half: "Here you earn rank by passing, not by clicking next." (`TRY_IT_LINES.stripeUnearned`) | "That's a stripe." would be untrue without a pass |
| The FAQ's heading is **Questions** | Plain word, same as the nav link |
| `/llms.txt` lists the Start here on-ramp and that it's for people 16 and over, besides the agreed wording | It describes the site for AI agents and should match the page |
| `DanBand` is exported from `components/brand/belt.tsx` | How it works reuses it for stop 7 |
| The sandbox keeps its steady height (`min-h-60`) from `sm` up only | On phones it left an empty band under step 1 |
| The dev scripts `.impeccable/capture.mjs` and `.impeccable/flash-test.mjs` drive the sandbox instead of the removed drill; `.impeccable/landing-e2e.mjs` is the page's run-through | They clicked the old "Submit drill" |
