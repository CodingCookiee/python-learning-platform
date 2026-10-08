# Python → AI Automation Learning Platform — Architecture

Status: in progress · Last updated: 2026-09-25 · Owner: Raza Awan

This document covers what the platform is for, what the current code actually does, and how to get it
to a platform where anyone can go from zero Python to shipping production AI agents **without leaving
the app** until the real-world project stage.

---

## 1. Goals

1. **Stay in the app.** Every concept is practiced in an in-browser editor with automatic grading.
   The learner opens a local IDE only for capstone projects, because using a real IDE is itself one of
   the skills being taught.
2. **Confidence comes from mastery, not from finishing.** "Completed" must mean "can do it again
   without hints". Finishing the old course without feeling confident is the core problem this design
   fixes.
3. **Two tracks, one path.**
   - **Track 1, Python**: 16 modules rewritten from scratch to reach advanced (see [CURRICULUM.md](CURRICULUM.md)).
   - **Track 2, AI Automation Engineer**: the roadmap in `AI_Automation_Roadmap_Raza_Awan.pdf`
     (workflows, LLMs, RAG, agents, MCP, production, portfolio).
4. **Works for anyone**: multi-user, safe to run publicly, with LLM costs kept under control.
5. **Content is code**: lessons and exercises live in version-controlled files, validated in CI, and
   safe to re-seed without wiping user progress.

Non-goals for now: payments, teams/classrooms, mobile apps, video hosting.

---

## 2. Current state review

### What's solid
- Next.js 16 App Router + React 19, Prisma 7 (pg adapter), NextAuth v5, Upstash cache, shadcn/Radix UI.
- ~55 lessons of written content across 16 modules, 16 projects, 30+ achievements, XP/levels/streaks.
- Pyodide already loads in the browser ([lib/pyodide.ts](../lib/pyodide.ts)), and lessons have runnable
  code blocks ([components/lesson/runnable-code.tsx](../components/lesson/runnable-code.tsx)).
- Monaco editor, sequential module and lesson unlocking, and an admin project-review flow.

### Critical problems (why it feels half-built)

| # | Problem | Where | Impact |
|---|---------|-------|--------|
| C1 | **Zero exercises exist.** `getExercisesForLesson()` returns `[]`, and `seed.ts` never calls it anyway. | [prisma/seed-data/exercises.ts](../prisma/seed-data/exercises.ts) | The whole exercise UI has nothing to run. This is why you kept switching to your IDE. |
| C2 | **The test runner is wrong.** It runs the code once and compares the same stdout to every test case. `testCase.input` is ignored. | [exercise-client.tsx:85-98](../app/(app)/exercises/[id]/_components/exercise-client.tsx#L85-L98) | Multiple test cases can't test different inputs. Function-level testing isn't possible. |
| C3 | **The server trusts the client's `passed: true`.** XP, achievements, and "solved" status come from whatever the browser sends. `executeCode()` exists but nothing calls it. | [submit/route.ts:8-13](../app/api/exercises/[id]/submit/route.ts#L8-L13), [lib/code-execution.ts](../lib/code-execution.ts) | Anyone can POST `passed:true` and earn XP. That's fine for one user, broken for a public platform. |
| C4 | **Pyodide runs on the main thread.** The timeout is a `Promise.race` that can't stop Python, so `while True:` freezes the tab. | [lib/pyodide.ts:102-110](../lib/pyodide.ts#L102-L110) | The first infinite loop a beginner writes locks up the page. |
| C5 | **No isolation between runs.** All runs share Pyodide `globals`, so variables from one lesson block or run leak into the next. stdout restore is skipped on exceptions, stderr isn't captured, and `input()` doesn't work. | [lib/pyodide.ts](../lib/pyodide.ts) | Wrong or confusing results: code "passes" because of leftover state. |
| C6 | **Lessons complete with a button click.** Nothing requires practice, and there are no checkpoints or review. | [app/api/progress/lesson/route.ts](../app/api/progress/lesson/route.ts) | This is the pedagogical root cause of "finished the course but not confident". |
| C7 | **Likely privilege escalation.** The `jwt` callback spreads client-supplied `session` into the token on `trigger === "update"`. Any signed-in user can POST to `/api/auth/session` and overwrite `email`/`sub`. `withAuth` resolves the user by `session.user.email`, so this could mean impersonation or admin access. Needs verification. | [auth.config.ts:108-111](../auth.config.ts#L108-L111) | High severity. Fix first. |

### Other issues

| # | Issue | Where |
|---|-------|-------|
| M1 | Module list defined twice, and the copies already disagree (OOP description) | [prisma/seed.ts:28](../prisma/seed.ts#L28) vs [seed-data/modules.ts](../prisma/seed-data/modules.ts) |
| M2 | Lesson content is split between seed files and runtime overrides in `lib/lesson-content.ts` and `lib/oop-module-content.ts`, so the DB isn't the source of truth | [lib/lesson-content.ts](../lib/lesson-content.ts) |
| M3 | The seed is destructive (it deletes all progress and submissions outside production), and IDs are random cuids, so any content change wipes learner history | [prisma/seed.ts:1134](../prisma/seed.ts#L1134) |
| M4 | Uses `prisma db push` and has no migrations, so schema changes in production are unsafe | `package.json` |
| M5 | `ExerciseSubmission` and `ProjectSubmission` have `userId` but no `User` relation. Deleting an account leaves orphan rows | [prisma/schema.prisma](../prisma/schema.prisma) |
| M6 | Admin check is an env list parsed differently in two places (the proxy trims whitespace, the API doesn't), so `a@x.com, b@x.com` breaks API admin access for `b` | [proxy.ts:43](../proxy.ts#L43), [lib/api-auth.ts:61](../lib/api-auth.ts#L61) |
| M7 | The rate limiter is an in-memory `Map`, which does nothing on serverless | [lib/api-auth.ts:85](../lib/api-auth.ts#L85) |
| M8 | The Redis client is built with `""` URL and token when env is missing, so every call errors and logs | [lib/redis.ts:9](../lib/redis.ts#L9) |
| M9 | Exercise `stats.attempts` counts only the 5 most recent submissions (`take: 5`) | [app/api/exercises/[id]/route.ts:32](../app/api/exercises/[id]/route.ts#L32) |
| M10 | Hints used aren't persisted (they reset on reload), and the solution unlocks after 3 attempts even if all 3 were empty runs | exercise-client / GET route |
| M11 | Project files are stored as base64 text in a DB column, and review is human-only, which doesn't scale beyond one admin | [projects/[id]/submit/route.ts](../app/api/projects/[id]/submit/route.ts) |
| M12 | Env var names mix NextAuth v4 (`NEXTAUTH_SECRET`) and v5 (`AUTH_SECRET`) conventions. There's no env validation at boot | [auth.config.ts:145](../auth.config.ts#L145), [proxy.ts:12](../proxy.ts#L12) |
| M13 | The timeline assumes ~27 h/week ("4-week compressed"). The roadmap budgets 10–12 h/week | seed + [lib/curriculum.ts](../lib/curriculum.ts) |
| M14 | Unused dependency (`ioredis`), no tests, no CI | `package.json` |

---

## 3. Target architecture

```
                         ┌────────────────────────── Browser ──────────────────────────┐
                         │  Next.js UI (lesson ⟷ editor split view, Monaco)            │
                         │        │ postMessage                                        │
                         │  ┌─────▼──────────────┐   Tier 1: pure Python, numpy,       │
                         │  │ Pyodide Web Worker │   pydantic, pytest-style tests,     │
                         │  │ + plp_runner.py    │   fake LLM client. Instant, free.   │
                         │  └────────────────────┘                                     │
                         └──────────────┬───────────────────────────────────────────────┘
                                        │ HTTPS
┌───────────────────────────────────────▼───────────────────────────────────────────────┐
│ Next.js server (Vercel)                                                               │
│  /api/exercises/:id/submit ──► Grader ──► ExecutionProvider ─┬─► Tier 2: server       │
│  /api/tutor (stream)       ──► AI Gateway ──► Claude API     │   sandbox (E2B or      │
│  /api/labs/:id/hook/:token ──► Lab verifier                  │   self-hosted runner)  │
│  /api/projects/:id/review  ──► AI reviewer (rubric → JSON)   │   network, pip, Docker-│
│                                                              │   like tasks, real SDK │
│  Prisma ──► Postgres (Neon/Supabase)   Upstash Redis (cache, rate limits, LLM quotas) │
└───────────────────────────────────────────────────────────────────────────────────────┘
        ▲
        │ `npm run content:sync` (idempotent upsert by slug; CI verifies every solution)
┌───────┴─────────┐
│ content/ (git)  │  tracks → modules → lessons (.md) + exercises (yaml, py, tests)
└─────────────────┘
```

### Key decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Where code runs | **Tiered.** Pyodide worker by default, server sandbox only when an exercise needs it | ~80% of Python Core exercises need nothing beyond the stdlib. The browser is free and instant. |
| Grading source of truth | `GRADING_MODE=client` (solo) → `server` (public) | Start simple, and switch to server re-verification before opening the platform to other people |
| Content source of truth | Git files → DB via idempotent sync | Reviewable, diffable, testable, and re-seeding keeps progress |
| IDs | Stable `slug` on Track/Module/Lesson/Exercise | Content edits never orphan progress |
| LLM access for learners | Platform **AI Gateway** with per-user quotas (optional BYOK later) | Learners shouldn't need an API key on day one, and the key never reaches the browser |
| Auth | Keep NextAuth v5 (JWT), add `role` column | Removes the `ADMIN_EMAILS` parsing bugs |

---

## 4. Content system (content as code)

```
content/
  tracks/
    python-core/
      track.yaml                       # slug, title, description, order
      01-fundamentals/
        module.yaml                    # slug, title, phase, order, prerequisites, est. hours
        lessons/
          01-setting-up-python.md      # frontmatter: slug, title, estMinutes, exercises: [...]
          02-variables-and-types.md
        exercises/
          swap-variables/
            exercise.yaml              # slug, title, type, difficulty, runtime, xp, tags, packages
            prompt.md
            starter.py
            solution.py
            tests.py                   # visible + hidden tests (see §5.3)
        project/                       # capstone: brief.md, rubric.yaml, template/, acceptance/
    ai-automation/
      ...
```

**Lesson markdown extensions** (rendered by the existing react-markdown pipeline):
- ` ```python run ` shows a runnable block, each run in a fresh namespace.
- `:::exercise swap-variables:::` embeds an exercise inline, so you practice mid-lesson.
- `:::quiz` gives a quick multiple-choice concept check with explanations.
- `:::js-bridge` is the existing JavaScript ⟷ Python comparison component.

**Tooling**
- `npm run content:validate` checks schemas (Zod) and links, runs every `solution.py` against its
  `tests.py` (must pass), and runs every `starter.py` against its tests (must fail at least one test,
  or the exercise tests nothing). It runs in CI on each PR.
- `npm run content:sync` upserts by slug and soft-archives removed items (`archivedAt`). It never
  deletes progress. It replaces `db:seed`.
- The old `seed-data/*.ts` and `lib/*-content.ts` get migrated into `content/` once, then deleted.

---

## 5. Exercise engine

### 5.1 Exercise types

| Type | Learner does | Graded by |
|------|--------------|-----------|
| `function` (default) | Implement a function or class | pytest-style tests call their code |
| `program` | Write a script using `input()`/`print()` | scripted stdin → compare stdout, per test |
| `predict` | "What does this print?" | Compare the typed answer to actual execution |
| `fix` | Starter is broken, fix it | Same as `function` |
| `refactor` | Make working code idiomatic or faster | Tests + static checks (AST rules, e.g. "no `for` with index") |
| `quiz` | Multiple choice / ordering | Answer key |
| `llm` | Write code against an LLM client (agent loop, tool calling, structured output) | Tests inject a **scripted fake client**, so grading is deterministic and costs nothing. An optional "Run live" goes through the gateway |
| `lab` | Do something outside the app (n8n workflow, deploy, Docker) | Verified by callback or probe (§5.6) |

### 5.2 Browser runtime (Tier 1)

- **Dedicated Web Worker** owns Pyodide (pin the latest stable release). The UI never blocks.
- **Timeouts are real:** on timeout the main thread calls `worker.terminate()` and starts a new worker.
  Pyodide is preloaded in a spare worker so restarts feel instant. (SharedArrayBuffer interrupts need
  COOP/COEP headers, which break third-party avatars and embeds, so they're deferred.)
- **Fresh namespace per run:** `exec(code, {"__name__": "__main__"})` into a new dict, with `solution`
  removed from `sys.modules` before each test run.
- **I/O:** stdout and stderr captured separately with a size limit, `builtins.input` fed from scripted
  stdin, and an in-memory FS preloaded with per-exercise fixture files (CSV/JSON for File I/O lessons).
- **Packages:** `exercise.yaml → packages: [numpy, pydantic, pandas]` loads through
  `pyodide.loadPackage` / `micropip` before running.
- **Async:** coroutine tests are awaited on Pyodide's event loop. The harness doesn't rely on
  `asyncio.run()`, since its behaviour differs in the browser (verify on the pinned Pyodide version).

Worker protocol:
```ts
// main → worker
{ id, kind: "run" | "test", code, tests?, stdin?, files?, packages?, timeoutMs }
// worker → main
{ id, status: "ok" | "error" | "timeout",
  stdout, stderr, durationMs,
  tests?: Array<{ name, passed, message?, hidden: boolean }>,
  error?: { type, message, line?, traceback } }
```

### 5.3 Test contract (`tests.py`)

Plain Python with a small helper module (`plp`) shipped to the worker and the sandbox:

```python
from plp import visible, hidden, run_program
from solution import word_count

@visible
def test_simple():
    assert word_count("a b a") == {"a": 2, "b": 1}

@hidden
def test_empty():
    assert word_count("") == {}

@visible
def test_program_greets():               # for type: program
    out = run_program(stdin=["Raza"])
    assert out.strip() == "Hello, Raza!"
```

The runner (`plp_runner.py`) collects `test_*` functions, runs each one with its own stdout capture,
and turns assertion failures into a readable diff (`expected {...}, got {...}`). **Run** executes
visible tests. **Submit** runs everything. Hidden tests are named but their bodies aren't shown.

### 5.4 Grading and anti-cheat

```
Submit ─► POST /api/exercises/:id/submit { code, clientResult }
            ├─ GRADING_MODE=client → trust clientResult (solo use)
            └─ GRADING_MODE=server → ExecutionProvider.run(code, allTests) → authoritative result
          ─► ExerciseAttempt row ─► ExerciseProgress upsert ─► XP/achievements (first pass only)
```
- `ExecutionProvider` is an interface with three implementations: `PyodideNodeProvider` (Pyodide in
  Node, fine for pure-Python tiers and cheap), `E2BProvider`, and `SelfHostedProvider` (the existing
  `code-execution.ts` contract).
- XP and mastery only count server-verified passes when `GRADING_MODE=server`.
- XP scales down with hints used. Viewing the solution gives 0 XP and schedules a review (§6).

### 5.5 Server sandbox (Tier 2)

Used when an exercise sets `runtime: sandbox`: real HTTP (httpx against platform mock APIs), `pip install`,
subprocess, running a FastAPI app and hitting it, SQLite/Postgres, the real `anthropic` SDK through the
gateway, and MCP servers.

- **Recommendation: E2B** to start (managed microVMs, per-second billing, Python SDK, sessions can
  persist across a lab). Keep the provider interface so a self-hosted runner on Fly.io or Railway can
  replace it if cost matters.
- Egress allowlist: platform mock APIs, PyPI, and the AI gateway. No other internet by default.
- Sandbox LLM calls use a **short-lived per-user gateway token**, never the real API key.

### 5.6 Labs (outside-the-app tasks, still auto-verified)

| Lab kind | Verification |
|----------|--------------|
| Webhook / n8n workflow | Each learner gets a unique URL, `/api/labs/{lab}/hook/{token}`. Their workflow must POST a payload matching a Zod schema (optionally HMAC-signed) |
| Deployed API | Learner submits a URL. The platform probes `/health` and runs contract tests, with SSRF guards that block private IP ranges |
| GitHub repo (capstones) | Clone into the sandbox, run hidden acceptance tests, then AI rubric review (§7.3) |
| Self-attested (last resort) | Checklist plus a screenshot or log excerpt. Gives reduced XP |

### 5.7 Workspace UI

- The lesson page becomes **split view**: content on the left, a persistent editor on the right.
  Inline `:::exercise` blocks load into the right pane, so you never leave the lesson.
- Multi-file tabs (Pyodide FS) for exercises that need `main.py` + `utils.py`.
- Test panel with per-test diffs, a traceback with a clickable line number, and an "Explain this error"
  button (§7.2).
- Code autosaves per exercise to the server, so it survives across devices. `localStorage` is only a
  fallback.
- Keyboard: `Ctrl+Enter` runs, `Ctrl+Shift+Enter` submits.

---

## 6. Learning design (how confidence gets built)

1. **Lesson completion requires its core exercises.** Every lesson lists `exercises: [required…]`.
   The "Complete" button only unlocks after they pass.
2. **Module checkpoint.** Once every lesson is done, the checkpoint opens: 6 drills (`checkpoint.pick`)
   drawn across the module's lessons from its core and stretch drills (or an explicit `checkpoint.pool`
   in `module.yaml`), each from its blank starter, with no hints and no reference solution, 20 minutes
   per drill, 80% to pass. **Passing the checkpoint is what passes the module** and unlocks the next one
   (+100 XP). A failed attempt shows what was missed and allows a fresh draw after 30 minutes. A module
   with nothing to draw from passes on its lessons. See `lib/checkpoint.ts` and `lib/mastery-rules.ts`.
3. **Spaced review.** A solved core or stretch drill (not warm-ups or predict drills) joins the review
   deck, due a day later. It comes back on `/review` with a blank starter and no solution, at 1, 3, 7,
   21, 60 and 120 days. A clean pass moves it up a stage (+5 XP); a pass that needed hints comes back
   tomorrow at the same stage; a fail starts it over and counts a lapse. Only a due review moves the
   schedule, and at most 12 are offered a day. See `lib/review.ts`.
4. **Skill map.** On the dashboard: for each open module and its most common tags, how firmly it's
   held. A drill counts 0 until solved, 0.4 once solved, and climbs to 1 as it survives reviews.
   Computed on read (`lib/skill-map.ts`), no stored mastery table.
5. **Placement test.** The checkpoint can be taken before the lessons are done ("Test out" on the
   module page). Passing it passes the module; its lessons stay open.
6. **"Advanced-confident" definition.** Track 1 is complete when all checkpoints pass **and** every
   Advanced tag is ≥80% mastery **and** 3 capstones pass acceptance tests.
7. **Learning log + weekly check-in** (from roadmap §07). This is an in-app form that pre-fills from
   activity and exports in the check-in template format.
8. **Pacing.** The learner sets hours per week at onboarding (default 10–12), and the dashboard plans
   the week to match.

---

## 7. AI features (built with Claude; also a live demo of Track 2 concepts)

All calls go through one provider-neutral module, `lib/ai/gateway.ts` (Anthropic Messages, OpenAI
Chat Completions and Gemini `generateContent` over plain `fetch`), and run on the **learner's own key** via
`callWithLearnerKey` in `lib/ai/credentials.ts`: it decrypts the key, enforces a per-learner daily
call limit (150), and writes an `LlmUsage` row per call (feature, provider, model, tokens in/out/cached).
Learners see their usage in Settings. Cost in dollars isn't estimated, since the learner's provider
bills them directly and prices change. This is the roadmap's "always track cost" rule, applied to the
platform itself.

**Built (M3):** 7.1 and 7.2. The tutor is a panel under the drill workspace; "Explain this error"
sits on every error box. Both are off during checkpoints, and in a review, asking the tutor counts as
a hint. The model is sent the drill (prompt, tests, the author's hints, starter), the learner's current
code and latest result as tagged data, and **never the reference solution**. `guardReply` in
`lib/ai/tutor.ts` removes any code block that defines a function the solution defines, runs over six
lines, or shares three consecutive lines with the solution.

| Feature | Behaviour | Model (configurable) |
|---------|-----------|----------------------|
| **7.1 Socratic tutor** (chat under the drill workspace) | Gets the exercise prompt, the learner's code and latest result. It asks guiding questions and points at the line, and **never outputs a full solution** (the model never sees it, the system prompt forbids it, and `guardReply` redacts replies that reproduce it). The drill context is prompt-cached on Anthropic. | The learner's choice in Settings (default `claude-opus-5-5` or `gpt-5-mini`) |
| **7.2 Explain this error** | One call that explains a traceback in plain English, with a JavaScript comparison where it helps, and asks the learner for the fix. | Same model |
| **7.3 Project reviewer** | Rubric from `rubric.yaml` → structured JSON output: score and evidence per criterion, security notes, next steps. Admin can override. The status becomes `ai_reviewed` → `approved`. | Same model (M4) |
| **7.4 Learner gateway** | Track 2 exercises and labs call Claude through `/api/ai-gateway/v1/messages` with a per-user token and quota. Optional BYOK later. | whatever the exercise specifies |

Guardrails: a per-learner daily call limit, logging of every request, and prompt-injection-aware
handling of learner code (learner code goes inside tagged data blocks, which it can't close, and is
never treated as instructions).

---

## 8. Curriculum map

The full syllabus, lesson by lesson, is in [CURRICULUM.md](CURRICULUM.md). The content format is in
[CONTENT.md](CONTENT.md). In summary:

| Track | Modules | Grades |
|-------|---------|--------|
| **Python** | 1 Python for developers · 2 Collections & control flow · 3 Functions & modules · 4 Pythonic idioms & stdlib · 5 OOP · 6 Errors, files & context managers · 7 Testing with pytest · 8 Iterators, generators & decorators · 9 Types, Protocols & Pydantic · 10 Tooling & packaging · 11 Data model & internals · 12 Concurrency · 13 Performance · 14 HTTP & APIs · 15 FastAPI · 16 Data & databases | 16 kyu → 1 kyu, and module 16 earns the black belt (1st dan) |
| **AI Automation** | A1 Automation foundations (webhooks, scheduling, integrations, Playwright, n8n labs) · A2 LLM fundamentals · A3 Structured output & tool calling · A4 RAG · A5 Agents · A6 MCP · A7 Production · A8 Portfolio & client work | 2nd → 9th dan |

- **Exactly 16 + 8 modules.** The grade system maps one module to one grade.
- **Target density:** 5–7 lessons per module, 3–6 drills per lesson, one checkpoint and one capstone per
  module (~450 drills). Authoring can be AI-assisted; `content:validate` running every solution is what
  makes that volume trustworthy.
- **AI lessons are provider-neutral.** Learners build one `llm` client with Anthropic and OpenAI
  adapters in A2 and use it for the rest of the track. Graded drills use scripted fake clients.
- **Browser-first.** Pyodide 314 (Python 3.14) ships numpy, pandas, pydantic, httpx, SQLAlchemy,
  FastAPI, pytest and mypy, so nearly all of the Python track runs in the browser. Only threads,
  subprocess, Docker, real servers, Playwright and n8n are local labs.

Unlock rule: the automation track opens after the Python black belt. Early access is allowed after
modules 9, 12 and 14 (Pydantic, asyncio and httpx are the roadmap's Phase 0).

---

## 9. Data model changes (Prisma)

Move to **`prisma migrate`**. Create a baseline migration from the current schema, then add these
changes incrementally.

```prisma
enum Role { LEARNER ADMIN AUTHOR }
model User        { role Role @default(LEARNER); weeklyHours Int @default(10); … }   // + relations below

model Track       { id; slug @unique; title; order; modules Module[] }
model Module      { + slug @unique; trackId; archivedAt?; contentHash }
model Lesson      { + slug @unique; archivedAt?; contentHash; requiredExercises via ExerciseLesson }
model Exercise    { + slug @unique; type; runtime ("browser"|"sandbox"); tags String[];
                    packages String[]; visibleTests Text; hiddenTests Text; archivedAt? }

model ExerciseAttempt  { id; userId→User; exerciseId; code; result Json; passed; verified Boolean;
                         hintsUsed; solutionViewed; durationMs; createdAt }         // replaces ExerciseSubmission
model ExerciseProgress { userId+exerciseId @@unique; status (unseen|attempted|passed|mastered);
                         bestAttemptId; firstPassedAt; savedCode Text; hintsRevealed Int }
model ReviewItem       { userId+exerciseId @@unique; stage; dueAt; lapses; reviews; lastReviewedAt }   // built (M2)
model CheckpointAttempt{ id; userId; moduleId; exerciseIds[]; passedIds[]; placement; score; passed;
                         startedAt; submittedAt? }                                   // built (M2)
// ExerciseSubmission gained mode (practice|review|checkpoint) and checkpointAttemptId; tag mastery is
// computed on read instead of stored
model LabToken         { id; userId; labSlug; token @unique; verifiedAt?; payload Json? }
model ProjectSubmission{ + userId→User relation; repoUrl?; blobKeys String[]; aiReview Json?;
                         status (pending|ai_reviewed|approved|changes_requested) }
model TutorThread      { id; userId; exerciseId?; messages TutorMessage[] }
model LlmUsage         { id; userId?; feature; model; inputTokens; outputTokens; cachedTokens;
                         costUsd Decimal; createdAt }
model LearningLogEntry { id; userId; weekOf; hours; built; learned; stuck; nextGoal }
```

Every user-owned table gets a `User` relation with `onDelete: Cascade`.

---

## 10. Security checklist

- [ ] **C7**: in the `jwt` callback, only accept whitelisted fields (e.g. `name`, `image`) on `update`,
      and resolve users by `token.sub`, never by email from the session.
- [ ] Roles in the DB. Remove `ADMIN_EMAILS` except as a one-time bootstrap (`ADMIN_BOOTSTRAP_EMAIL`).
- [ ] Upstash `@upstash/ratelimit` on auth, submit, tutor, gateway, and lab hooks.
- [ ] Server grading before public launch (C3).
- [ ] Sandbox: no secrets inside, egress allowlist, CPU/memory/time limits, per-user concurrency limit.
- [ ] SSRF guards on "probe my deployed URL" labs.
- [ ] Real email verification + password reset (Resend) before public signup. It's currently
      auto-verified.
- [ ] Env validation at boot (`lib/env.ts` with Zod). Fail fast with a clear message.
- [ ] Project uploads go to object storage with size and type limits, not base64 in Postgres.

---

## 11. Infrastructure & environment variables

Hosting stays **Vercel** (app) + **Neon or Supabase Postgres** + **Upstash Redis** + **E2B** (sandbox).
Every variable is listed in [`.env.example`](../.env.example). Summary:

| Variable | Needed for | Required? | How to get it |
|----------|-----------|-----------|---------------|
| `DATABASE_URL` | Everything | **Yes** | Neon/Supabase pooled connection string |
| `DIRECT_URL` | `prisma migrate` (bypasses the pooler) | Yes with a pooler | Same provider, direct/non-pooled string |
| `AUTH_SECRET` | Sessions (replaces `NEXTAUTH_SECRET`) | **Yes** | `npx auth secret` or `openssl rand -base64 32` |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | Callbacks, absolute links | Yes in prod | Your domain |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub login | Optional | GitHub → Settings → Developer settings → OAuth Apps |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google login | Optional | Google Cloud Console → OAuth client |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Cache, rate limits, LLM quotas | Recommended (app degrades without it) | Upstash console |
| `ENCRYPTION_KEY` | Encrypting learners' AI keys (AES-256-GCM) | **Yes for §7** | `openssl rand -base64 32`. Rotating it makes stored keys unreadable, so learners re-paste them |
| `ANTHROPIC_API_KEY` | Nothing yet: an optional platform key for a future free trial | No | Learners bring their own keys in Settings |
| `VOYAGE_API_KEY` (or `OPENAI_API_KEY`) | Embeddings for the RAG module and site search | For Track 2 A4 | Voyage AI / OpenAI dashboard |
| `E2B_API_KEY` | Tier 2 sandbox | For sandbox exercises | e2b.dev |
| `CODE_EXECUTION_API_URL` / `_KEY` | Self-hosted sandbox alternative | Only if not using E2B | Your runner deployment |
| `GRADING_MODE` | `client` or `server` | No (default `client`) | `server` before public launch |
| `RESEND_API_KEY`, `EMAIL_FROM` | Verification & reset emails | Before public signup | resend.com + a verified domain |
| `BLOB_READ_WRITE_TOKEN` | Project file uploads | For uploads | Vercel → Storage → Blob |
| `LAB_SIGNING_SECRET` | Signing lab webhook tokens | For labs | `openssl rand -base64 32` |
| `ADMIN_BOOTSTRAP_EMAIL` | First admin account | Once | Your email |
| `LANGFUSE_PUBLIC_KEY` / `_SECRET_KEY` / `_HOST` | Tracing the platform's own LLM calls (dogfooding A7) | Optional | Langfuse cloud or self-host |
| `SENTRY_DSN` | Error tracking | Optional | sentry.io |

---

## 12. Delivery plan

Each milestone is shippable and leaves the app better than before.

**Status (2026-09-30).** M0 to M3 are done, and M4/M7 are done apart from the items listed at the end:
- **Runtime:** a module Web Worker (`public/workers/python-worker.mjs`) running Pyodide 314. It enforces a real timeout by terminating the worker and gives every run a fresh module.
- **Harness:** the `plp` harness (`public/py/`):
  - failure messages from rewritten asserts;
  - 2 s time limits per test;
  - helpers for pytest, mypy, CLI, logging and HTTP;
  - `plp_fakes` for LLM providers, APIs, embeddings and MCP.
- **Content tooling:**
  - the `content/` pipeline with Zod schemas;
  - `content:validate`, which runs every solution, starter and example in the same runtime inside Node worker threads;
  - `content:sync`, which upserts by slug, archives removed items instead of deleting them, and can publish only chosen modules;
  - `Track`, slugs and archiving in the schema.
- **App:** the new drill workspace (function, program, predict, fix, refactor and "write the tests" drills), lesson completion gated on required drills, and achievements evaluated from criteria in `content/achievements.yaml`.
- **Content:** all 24 modules are live (162 lessons, 781 drills, 24 capstones); `npm run content:sync -- --dry-run` shows the set.
- **Workspace (M1):** practice code autosaves to the server (`DrillDraft`, debounced) with localStorage as the fast local copy, newest wins. Lessons have a split view: a scratchpad pane beside the lesson (a bottom drawer on phones) that any runnable example can be sent to.

- **Mastery (M2):** module checkpoints that pass the module, placement tests ("test out"), the spaced-review deck and `/review` queue, and the skill map on the dashboard (§6). Drills inside an open checkpoint are served without hints or solution wherever they're opened.

- **AI (M3):** learners' own keys (Anthropic, OpenAI or Google Gemini) encrypted in `AiCredential`, the Socratic tutor and error explainer on drills, and `LlmUsage` logging with a daily limit (§7).

- **Server grading (M4):** with `GRADING_MODE=server` the submit route re-runs the drill's tests in Node Pyodide (`lib/grading/server.ts`, the same pool `content:validate` uses) and records that verdict, not the browser's. If the grader itself fails, the attempt isn't recorded (503). `next.config.ts` traces Pyodide, the pool and the harness into the submit function; downloaded packages cache in `PLP_CACHE_DIR` (`/tmp/pyodide` on Vercel).
- **Labs (M4):** a lesson's `lab:` frontmatter (docs/CONTENT.md) declares how its local lab is verified: a personal webhook URL (`/api/labs/hook/{token}`, body checked against expected fields), a probe of a deployed https URL (private addresses refused), or pasted command output matched against patterns. 18 lessons have one. Verifying earns 15 XP; labs never block a lesson.
- **Capstones (M4):** an AI review on the learner's own key (`lib/ai/reviewer.ts`): uploaded files or a public GitHub repo are read against the capstone's criteria and come back as met / partly / not yet with evidence, security notes and next steps. The learner and the examiner both see it; the examiner still decides. Uploads stay in the database (`ProjectSubmission.files`), limited to 60 files and 4 MB, with larger projects linked from GitHub, so Vercel Blob isn't needed.
- **Accounts (M7):** email verification and password reset with one-time hashed tokens (`lib/auth-tokens.ts`) sent through Gmail SMTP (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) or Resend (`lib/email.ts`); links use the configured origin, never the Host header. With neither configured, sign-ups are verified automatically and reset shows that email isn't set up. Sign-in distinguishes "confirm your email" and "too many attempts".
- **Rate limits (M7):** fixed-window limits in `lib/rate-limit.ts` (Upstash, or in-memory without it) on sign-in, sign-up, email sends, password changes, submissions, the tutor, reviews, checkpoints, labs and drafts.
- **Onboarding and pacing (M7):** new learners answer three questions (experience, goal, hours a week) at `/onboarding`. The dashboard shows this week's estimated training against the target, the projected date for the goal, and a nudge to test out of the current module for learners who already code.
- **Accessibility (M7):** axe (WCAG 2.2 A/AA) is clean on the dashboard, syllabus, module, lesson, drill, review, checkpoint, capstone, settings, onboarding and achievements pages, in light and dark.

- **Learning log (§6.7):** `/log` drafts each week's check-in from activity (estimated hours, lessons, checkpoints, capstones, labs, drills passed and topics practised, drills still failing, the next lesson) and exports it in the roadmap's check-in template. Entries are kept per week (`LearningLogEntry`).
- **Black belt (§6.6):** passing module 16 leaves the learner at 1 kyu with a full brown belt. The black belt needs every Python checkpoint, every topic taught in modules 8–13 (with 4+ drills) at 80% skill-map strength, and three approved Python capstones (`lib/black-belt.ts`); the rank card lists what's left. The "Python Master" achievement uses the same rule (`kind: black-belt`). Capstones count on the examiner's approval until acceptance tests run in a sandbox.
- **Checkpoint feedback:** a closed attempt with misses lists the topics of the missed drills, the lessons to reread and the drills to redo.
- **Multi-file drills:** an exercise can have other files (`files:` in exercise.yaml, docs/CONTENT.md), shown as editor tabs; read-only ones are locked. The runner serves the learner's modules to Python's import system from memory under their own names (so tracebacks and time limits cover them) and writes data files to the working directory. Validation, server grading, drafts and the tutor all carry every file. Two drills use it so far, in module 3's "Modules and imports".
- **Admin AI usage:** `/admin/ai` shows calls and tokens per day, by feature, by model and by learner, the prompt-cache hit rate and how many learners have a key, over 7, 30 or 90 days.
- **Beginner on-ramp (M8 part 1, 2026-10-07):** the Start track (`content/tracks/start/`, `grade: none`, order 0) with one module, "Start here: programming from zero", 6 lessons and 44 drills for people who have never programmed. A `grade: none` track gives no grade and has no checkpoint (lib/curriculum-state.ts, lib/checkpoint.ts), so it never gates module 1 or changes rank. `lib/onramp.ts` tracks a learner's place; the dashboard shows an on-ramp card (belt with a knot per lesson, what's left, Continue, a 3-day streak goal) for beginners and anyone who has started it, until it's finished. Finishing lesson 6 earns White Belt Tied and plays a one-time ceremony that hands over to module 1. Five badges use two new achievement criteria, `module-lessons` and `drill-type`. "New to programming" in onboarding lands on the on-ramp. Learners must be 16 or over: a checkbox at sign-up and a question in onboarding for other sign-ins, stored as `User.ageConfirmedAt`.
- **First-session quest (M8 part 2, 2026-10-07):** a sensei walks each new learner through five real actions in their first lesson (the on-ramp's lesson 1 for beginners, module 1's for everyone else): run an example, try the scratchpad, pass a drill, fix a bug, see their record on the dashboard. Progress is a `QuestProgress` row per learner; `lib/quest.ts` holds the rules and `lib/quest-steps.ts` the steps and every line the sensei says. The browser reports three steps (`POST /api/quest/event`, only while the quest is active); drill passes record the other two where submissions are stored, and never fail a submission. The panel (`components/quest/`) sits in the signed-in layout: a card or a pill, pointers around the real controls (`data-quest-target`), out of the way while the learner types or has the scratchpad open, hidden on checkpoints. It starts automatically after first-time onboarding, can be skipped and resumed, and existing learners get a one-time offer on the dashboard with steps their history covers already ticked. Finishing awards Ready to Train (a new `quest` criterion) with a farewell. The quest guides only: it never gates anything or changes rank.
- **Landing page for everyone (M8 part 3, 2026-10-08):** the hero speaks to everyone (free, nothing to install, no experience needed) with two ways in, **I've never coded** and **I already code**. A "Try it" sandbox replaces the old live drill: run a line, fix a missing quote against Python's real error, pass one test, and a stripe goes on the belt ladder, with no account (`components/landing/try-it.tsx`, checks in `lib/landing/try-it.ts`; Python downloads on the first pointer, touch or focus inside the frame, with a plain fallback if it can't start). Below it: **How it works** (seven stops from lessons to the dan grades, replacing "Rank is earned, not clicked."), **Who it's for** (never coded, students, developers; 16 and over), and a **FAQ** (cost, time, what you need, belts as qualifications, who can join) whose hours come from the modules (`lib/landing/facts.ts`) and which is also `FAQPage` structured data. "I've never coded" links to `/auth/signup?start=new`; the sign-up form remembers it (`lib/start-intent.ts`, also before Google or GitHub sign-up) and onboarding pre-selects "New to programming". `/llms.txt` and the site description say it's free and for everyone.
- **Public site and security (2026-10-06):** `robots.txt`, `sitemap.xml` and `/llms.txt` (app/robots.ts, app/sitemap.ts, app/llms.txt); per-page titles, descriptions and canonical links, with a generated share card (app/opengraph-image.tsx, lib/page-titles.ts for lessons, drills, modules, capstones and checkpoints); a privacy policy at `/privacy` (contact address from `CONTACT_EMAIL`). Every page gets a Content-Security-Policy with a per-request nonce from `proxy.ts` (lib/csp.ts: only this site plus the exact Monaco and Pyodide CDN paths, WebAssembly and PyPI), and next.config.ts adds `X-Frame-Options`, `nosniff`, a referrer policy, a permissions policy and HSTS. Because of the nonce every page renders per request. The sign-in and sign-up pages render on the server (only the forms are client components). Audited with squirrelscan and axe: no axe violations on the main signed-in pages in light or dark.

- **Acceptance tests in GitHub Actions:** capstones (`capstone/acceptance/`) and `github` labs run their tests in the learner's own public repo through a workflow file generated per connection (`lib/ci/workflow.ts`). The workflow fetches the suite from `/api/ci/suite/{token}` and posts results to `/api/ci/report/{token}`; a run only counts after GitHub's API confirms it belongs to the connected repo, used the unmodified workflow file, and succeeded (`lib/ci/links.ts`). Costs nothing: GitHub Actions is free on public repos. A capstone that passes its acceptance tests counts toward the black belt like an approved one, and stays passed (`verifiedAt`) whatever later runs or posted reports say; a passed github lab is a verified lab. The tests run with `python -P -m pytest --noconftest --disable-plugin-autoload`, so the repo can't swap in its own pytest, conftest or plugins, though the learner's code still shares the environment: the examiner's review remains the real check. Reports only say which run to look up; the run link shown is rebuilt from the connected repo, and GitHub problems (rate limits) back off for two minutes. `npm run content:acceptance` checks each suite against a reference solution locally.

Still open:
- For a public launch: moving email from Gmail to Resend on your own domain (Gmail allows about 500 a day and may land in spam), and switching `GRADING_MODE` to `server` before a public launch.

| # | Milestone | Contents | Exit criteria |
|---|-----------|----------|---------------|
| **M0** | Stabilize (≈1 wk) | Fix C7, M5, M6, M8, M12. `lib/env.ts`, baseline migration, Redis no-op fallback, CI (lint + typecheck + build) | CI green. Admin and session exploits closed |
| **M1** | Exercise engine | Worker runtime (C4, C5), `plp` harness, all Tier 1 types, new attempt/progress tables, split-view workspace, `content/` pipeline + `content:validate`/`sync`, **Module 1–3 exercises authored** | You can do modules 1–3 entirely in the app |
| **M2** | Mastery layer | Lesson gating (C6), checkpoints, spaced review queue, tag mastery, placement tests. Exercises for the rest of Track 1 plus new modules 4, 11, 12, 14 | Track 1 fully practicable in-app |
| **M3** | AI assist | Gateway + `LlmUsage`, tutor, error explainer, cost dashboard (admin) | Tutor helps without leaking solutions, and cost per learner is visible |
| **M4** | Sandbox, labs, reviews | `ExecutionProvider` + E2B, server grading (C3), labs + tokens, AI project reviewer, Blob uploads | Capstones auto-reviewed. `GRADING_MODE=server` works |
| **M5** | Track 2 part 1 | A0–A4 content, fake LLM client library, RAG sandbox with pgvector | Roadmap Phases 1–3 doable in-app |
| **M6** | Track 2 part 2 | A5–A8, MCP harness, red-team labs, learning log + weekly check-in, portfolio export | Roadmap Phases 4–6 doable in-app |
| **M7** | Public-ready | Email verification/reset, rate limits everywhere, onboarding + pacing, analytics, accessibility pass, docs for content authors | Safe to share with anyone |
| **M8** | Everyone welcome (§16) | 1. Beginner on-ramp before module 1 (done 2026-10-07) · 2. First-session quest after onboarding (done 2026-10-07) · 3. "How it works" on the landing page (done 2026-10-08) | A complete beginner, a student and a developer each understand the app from the landing page and finish a guided first session |

---

## 13. Decisions (2026-09-24)

| # | Question | Decision | Consequence |
|---|----------|----------|-------------|
| 1 | Existing data | Fresh Neon DB, nothing to keep | Clean baseline migration `20260924000000_init` |
| 2 | Audience | Raza first, then public | `GRADING_MODE=client` now. Server grading, email verification, and rate limits are required before opening signups (M7) |
| 3 | Sandbox | **No paid sandbox.** Browser-first | See §14 |
| 4 | LLM access | **Bring your own key (BYOK)** | The platform pays $0 for AI. See §14 |
| 5 | Budget | ~$0/month | Free tiers only: Vercel Hobby, Neon free, Upstash free |
| 6 | Hosting | Vercel | Serverless limits shape the grader (§14). Note that Vercel Hobby is for non-commercial use, so charging learners later means upgrading to Pro |

## 14. Zero-budget adjustments (overrides §5.5, §7, §11 where they differ)

**Code execution without a paid sandbox**
- Tier 1 (the Pyodide worker in the browser) does as much as possible. HTTP exercises call
  **same-origin mock APIs** served by the app (`/api/mock/*`), so there's no CORS problem and no
  sandbox is needed. Pyodide can reach them through `pyodide.http` / `pyfetch`.
- **Server grading** (M4, before public launch) runs Pyodide *inside a Vercel Node function* against
  hidden tests. It's free within Hobby limits and needs no extra service. Heavy exercises stay
  browser-graded.
- Things that genuinely need a real machine (`pip install`, subprocess, Docker, running a FastAPI
  server, Playwright, MCP servers) become **local labs**. The learner runs them on their own computer
  and the platform verifies the result: webhook callbacks, probing a deployed URL, or a GitHub repo
  whose GitHub Actions run the acceptance tests for free and report back.
- `ExecutionProvider` stays as an interface, so E2B or a self-hosted runner can be added later if
  there's budget.

**AI with learners' own keys**
- Learners paste their own Anthropic key in Settings. It's encrypted at rest with AES-256-GCM using
  `ENCRYPTION_KEY`, decrypted only server-side per request, never sent back to the browser, and
  deletable at any time.
- The tutor, error explainer, and project reviewer all run on the learner's key. Without a key, those
  features show a "Add your API key" prompt and everything else still works.
- `LlmUsage` still logs tokens and estimated cost per call, so learners see what they spend. That's
  the roadmap's "always track cost" rule.
- The platform needs **no** `ANTHROPIC_API_KEY`. An optional platform key can be added later to give
  new learners a small free trial.

## 15. Decisions (2026-09-25): the course rewrite

| # | Question | Decision | Consequence |
|---|----------|----------|-------------|
| 1 | Web3 | **Removed** | The module, lessons, capstone, achievements, starter template and `ALCHEMY_API_KEY` are deleted |
| 2 | Python course | **Rewritten to reach advanced**, 16 modules | Adds idioms & stdlib, internals and performance; drops DevOps and Web3 as standalone modules ([CURRICULUM.md](CURRICULUM.md)) |
| 3 | Automation course | **8 modules, A1–A8**, following the roadmap | They map to 2nd–9th dan |
| 4 | n8n | **Python first, n8n as local labs** verified by webhook | Automations are written in Python in the app; n8n lessons run on the learner's machine |
| 5 | AI provider | **Provider-neutral** | Every AI example works with both Anthropic and OpenAI through the learner's own `llm` wrapper |
| 6 | JavaScript comparisons | **Kept as short `[!JS]` asides** | Beginners can skip them |
| 7 | Rollout | **Engine first, then module by module** | The exercise engine and content pipeline ship first, then modules 1–3 as the reference, then the rest in order |
| 8 | Old lessons | **Replaced, not migrated** | The 64 old seed lessons and `lib/*-content.ts` overrides are deleted once `content/` is live |
| 9 | Runtime | **Pyodide 314.0.7 (Python 3.14.2)** in a Web Worker | Matches local Python 3.14, which `content:validate` uses to run every solution |

## 16. Decisions (2026-10-07): a course for everyone

The audience widens from developers to everyone: people who have never programmed, students, and
developers. Retention depends on a new learner understanding the app at once and getting a first
success in their first session.

| # | Question | Decision | Consequence |
|---|----------|----------|-------------|
| 1 | Learners who have never programmed | **A beginner on-ramp before module 1** | A short module in plain language (what a program is, values and names, decisions, loops, functions) with in-browser drills. It sits "before the white belt", outside the 16 kyu grades, so no module is renumbered. Developers skip it. See [CURRICULUM.md](CURRICULUM.md#before-the-white-belt-the-on-ramp) |
| 2 | First login | **A first-session quest**, not a tooltip tour | Like a game's tutorial level: after onboarding, a short quest on the real app where the learner runs their first code, passes their first drill and sees their first progress, with a quest tracker, pointers to each part of the screen as they reach it, and a reward at the end. It starts from each learner's starting point (the on-ramp or module 1) |
| 3 | Explaining the app to visitors | **A hands-on "How it works" section on the landing page** | One learner's journey step by step (lesson, drill, grading, belt, capstone, black belt, AI grades) with steps to try for real, then "Who it's for" (beginners, students, developers) and an FAQ (cost, time, what you need) |
| 4 | Order | **On-ramp, then quest, then landing page** | The quest needs each learner's starting point and the landing page describes the finished experience. The on-ramp's lessons can be written while the quest is built |

Each part gets its own design, spec and plan before it's built (milestone M8 in §12).

