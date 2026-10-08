# Waiting states across the app: plan

Date: 2026-10-08 · Owner: Raza Awan · Approved in chat (design, scope and four choices)

**Status: done (2026-10-08).** All four phases are built and checked in the browser on a production
build (`.impeccable/waiting-e2e.mjs`, `ONLY=phase1,…,phase4,signedout`), with no axe violations.
Not browser-checked, because they need a real API key, files or a GitHub repo: the AI review, the
capstone upload and the GitHub checks. The admin loading screens were checked only by the type
checker and lint (the throwaway test accounts aren't admins).

Wherever the app makes someone wait, it should say what it's doing, in the same way everywhere, so
nothing looks stuck. Built from the AI tutor's waiting state (`lib/tutor/wait-lines.ts`).

## Owner's choices

| Question | Decision |
|----------|----------|
| "Next drill" while a pass is saving | It waits for the save ("Saving your pass…"), then goes, so XP, achievements and level-up always show. The same for "Mark lesson complete" moving on |
| Scope | Everything, in four phases, each built and browser-checked before the next |
| Bugs found that aren't about waiting | Listed below, fixed later. Bugs that make things look stuck are fixed in this pass |
| Navigation | A thin jade bar at the top while a page loads, plus a matching loading screen for every page that takes time |

## The shared pieces

1. **Staged lines** (`lib/pending/stages.ts`, `components/ui/pending-line.tsx`): short lines naming a
   wait's real phases, moving on every couple of seconds and holding on the last, then "still
   working" lines if it runs long. Screen readers hear the first line and "still working" only. The
   tutor's lines use the same timing helper.
2. **Busy button** (`components/ui/loading-button.tsx`, fixed and used): spinner and a verb while
   working, one width and full opacity (DESIGN.md: async buttons swap only icon and label), ignores
   repeat clicks, `aria-busy`, and stays busy until the next page appears when the action navigates.
3. **Navigation bar** (`components/layout/navigation-progress.tsx`): starts on any in-app link
   click (or `startNavigation()` for programmatic moves), finishes when the URL changes. Next links
   always prevent the click's default to route it themselves, so a link whose own handler holds the
   move (the drill page while a pass saves) calls `holdNavigation()` instead. When a page's loading
   screen was prefetched, Next changes the URL at once and the loading screen is the feedback; the
   bar covers the clicks where it isn't ready yet.
4. **Python says what it's doing**: "Downloading Python…", "Starting Python…", "Loading pandas…",
   "Running your tests…", available to every page through `useRuntimeStatus`/`usePyodide`. A
   download that runs out of time says so instead of blaming the learner's code.

## Phases

1. **Shared pieces, the drill page, Python's status.** The save after "Run tests" gets staged lines
   ("Saving your pass…", "Double-checking your tests on our server…" when grading is on the server,
   "Adding your XP…"); "Drill passed" waits for the server's verdict; a failed save says so with
   Try again; "Next drill" and "Back to review" wait for the save; checkpoint and review banners
   stop showing stale text while saving; the outcome is announced; a quiet "Draft saved" note.
2. **Lessons, checkpoints, review, capstones.** Example and scratchpad runs show Python's phase in
   the output area; "Mark lesson complete" says where it's taking you and keeps achievements on
   screen; checkpoint start ("Drawing your drills…"), hand-in ("Marking your checkpoint…", its XP
   and achievements shown, no stuck spinner) and time's up; capstone upload and the AI review get
   staged lines; GitHub connect/check get busy labels and handle failures; loading screens for
   checkpoints and review.
3. **Auth, onboarding, settings, dashboard, search, sign-out.** Buttons stay busy through the
   navigation that follows; sign-up names the email step; reset can't be sent twice; the AI key
   test shows its progress next to its button; the quest panel and offer, search ("Searching…",
   results announced, no false "no matches"), sign-out and the log's refill get states.
4. **Navigation.** The top bar; loading screens for log, profile, achievements, settings,
   onboarding and the admin pages; the dashboard, syllabus and module skeletons redrawn to match
   their pages, with screen-reader text.

Each phase: typecheck, lint, unit tests, and a browser run on a production build (throwaway
accounts, deleted afterwards).

## Later (found in the sweep, not about waiting)

- Google and GitHub sign-in are configured but have no buttons, and `pages` points at
  `/auth/error`, `/auth/signout` and `/auth/verify`, which don't exist (an auth error lands on 404).
- Sign-up says "check your inbox" even when the confirmation email failed to send.
- The navbar and mobile menu keep the old name after a rename (no session update or refresh).
- Achievements shows "0 / 0" and the admin queue shows "The queue is empty" when their data fetch
  fails, instead of an error.
- Profile silently redirects to the dashboard when its data fetch fails.
- Labs: a newly verified lab's +15 XP isn't shown.
- Lesson complete ignores `levelUp` and `milestone` in its response.
- The streak ping logs unlocked achievements to the console instead of showing them; a reset streak
  isn't reflected on an already-rendered dashboard.
- Error pages' "Try again" only calls `reset()`, without refreshing the server render.
- The admin evaluate screen shows a JSON parse error verbatim when the route returns a non-JSON 500.
- Framer-motion page transitions ignore reduced motion (no `MotionConfig`).
- The dashboard recomputes the curriculum state four times per render (performance).
- The drill save route (`/api/exercises/[id]/submit`) makes about 25 database calls one after another:
  about 7 s against the remote dev database. Parallelising them would shorten every save.
- A session whose account no longer exists (deleted elsewhere) leaves the dashboard on its skeleton: it
  redirects to sign-in, and sign-in sends a signed-in session back to the dashboard.
