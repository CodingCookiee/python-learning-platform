# Python → AI Automation Learning Platform — Architecture

Status: proposal · Last updated: 2026-09-24 · Owner: Raza Awan

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
   - **Track 1, Python Core → Advanced**: the existing 16 modules, fixed and extended.
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
        checkpoint.yaml                # module exam: exercise pool + pass mark
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
2. **Module checkpoint.** 5–8 problems drawn from a pool, no hints, no solutions, 80% to pass. Passing
   unlocks the next module. Failing shows which concept tags to review.
3. **Spaced review.** Solved exercises come back at ~1, 3, 7, 21, and 60 days with a **blank editor**
   (retrieval practice). Anything solved with hints or the solution comes back sooner. A daily
   "Review (5 min)" queue sits on the dashboard.
4. **Skill map.** Exercises carry concept tags (`comprehensions`, `decorators`, `asyncio.gather`,
   `tool-calling`…). Mastery per tag = recent hint-free passes weighted by recency. The dashboard shows
   strong and weak areas instead of just "% complete".
5. **Placement test.** Experienced learners (like a JS developer) can test out of a module by passing
   its checkpoint directly.
6. **"Advanced-confident" definition.** Track 1 is complete when all checkpoints pass **and** every
   Advanced tag is ≥80% mastery **and** 3 capstones pass acceptance tests.
7. **Learning log + weekly check-in** (from roadmap §07). This is an in-app form that pre-fills from
   activity and exports in the check-in template format.
8. **Pacing.** The learner sets hours per week at onboarding (default 10–12), and the dashboard plans
   the week to match.

---

## 7. AI features (built with Claude; also a live demo of Track 2 concepts)

All calls go through one server module, `lib/ai/gateway.ts`, which handles auth, per-user daily token
and cost quotas (Upstash), prompt caching, and a `LlmUsage` row per call (model, tokens in/out/cached,
cost, feature). This is the "always track cost" rule from the roadmap, applied to the platform itself.

| Feature | Behaviour | Model (configurable) |
|---------|-----------|----------------------|
| **7.1 Socratic tutor** (streaming chat in the editor pane) | Gets the exercise prompt, the learner's code, failing test output, and hints used. It asks guiding questions and points at the line, and **never outputs a full solution** (enforced in the system prompt and by a post-check that compares the reply's similarity to `solution.py`). Exercise context is prompt-cached. | `claude-opus-5` default, set by `AI_TUTOR_MODEL` |
| **7.2 Explain this error** | One call that explains a traceback in plain English, with a JavaScript comparison where it helps. | `AI_FAST_MODEL`. Using a cheaper model such as `claude-haiku-4-5` here is your call |
| **7.3 Project reviewer** | Rubric from `rubric.yaml` → structured JSON output (`output_config.format`): score and evidence per criterion, security notes, next steps. Admin can override. The status becomes `ai_reviewed` → `approved`. | `AI_REVIEW_MODEL` (default `claude-opus-5`) |
| **7.4 Learner gateway** | Track 2 exercises and labs call Claude through `/api/ai-gateway/v1/messages` with a per-user token and quota. Optional BYOK later. | whatever the exercise specifies |

Guardrails: per-user daily cost cap, a global monthly cap (`AI_MONTHLY_BUDGET_USD`), logging of every
request, and prompt-injection-aware handling of learner code (learner code goes inside tagged data
blocks and is never treated as instructions).

---

## 8. Curriculum map

### Track 1: Python Core → Advanced (revised)

| Phase | Modules (★ = new) |
|-------|-------------------|
| Foundation | 1 Setup & fundamentals · 2 Data structures & control flow · 3 Functions & modules · ★ 4 Pythonic idioms & stdlib (collections, itertools, functools, dataclasses, enum, datetime, pathlib, re, logging) |
| Intermediate | 5 OOP · 6 File I/O & exceptions · 7 Testing with pytest · 8 Packaging with **uv** + pyproject (Poetry as an aside) |
| Advanced | 9 Iterators, generators, decorators, context managers · 10 Type hints, Protocols, generics, **Pydantic** · ★ 11 Concurrency: asyncio in depth + threads + processes · ★ 12 Python data model & internals (dunders, descriptors, GIL, imports, memory) · 13 Performance & profiling |
| Applied | ★ 14 HTTP clients & APIs (httpx, auth, pagination, retries, backoff) · 15 FastAPI web services · 16 Databases (SQLAlchemy 2.0, async) · 17 Data processing · 18 CLI & automation scripting (typer, subprocess, Docker) · 19 Web3 with Python |

Target density: **5–8 exercises per lesson, one checkpoint and one capstone per module** (~400 exercises).
Authoring can be AI-assisted. CI verification (§4) is what makes that volume trustworthy.

### Track 2: AI Automation Engineer (maps to the roadmap)

| Module | Roadmap phase | In-app practice | Capstone |
|--------|---------------|-----------------|----------|
| A0 Automation thinking (Trigger → Context → Decision → Action) | §02 | Decompose-a-process quizzes | — |
| A1 Workflow automation: webhooks, HMAC, n8n, Playwright | Phase 1 | FastAPI webhook receiver in the sandbox, n8n webhook labs, Playwright in the sandbox | Lead capture + Web3 alert workflows |
| A2 LLM fundamentals: tokens, cost, Messages API, prompting, streaming | Phase 2 | Cost-estimator functions, fake-client exercises, live runs through the gateway | Model comparison script |
| A3 Structured outputs & tool calling by hand | Phase 2 | Pydantic validation + retry loop, a hand-written tool dispatcher | Support triage service |
| A4 RAG: embeddings, chunking, pgvector, grounding, retrieval evals | Phase 3 | Chunkers and cosine similarity in numpy (browser), pgvector in the sandbox | Docs chatbot with citations |
| A5 Agents: the loop from scratch, tool design, memory, human-in-the-loop, workflow patterns | Phase 4 | The roadmap's ~80-line agent loop, graded against a scripted fake client (step caps, tool errors) | Research agent with a cost cap |
| A6 MCP: build and test an MCP server | Phase 4 | MCP server in the sandbox, tested by a harness MCP client | Read-only Web3 MCP server |
| A7 Production: evals, tracing, reliability, cost, prompt injection, deploy | Phase 5 | Eval-suite exercises, red-team labs (injected instructions inside documents the agent reads) | Harden and deploy the best project |
| A8 Portfolio & getting paid | Phase 6 | Case study builder, offer writer, mock client call with the tutor | 3 case studies + outreach |

Unlock rule: Track 2 opens after Track 1's Foundation + Intermediate checkpoints plus modules 10, 11,
and 14 (Pydantic, async, and httpx are the roadmap's Phase 0).

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
model ReviewItem       { userId+exerciseId @@unique; dueAt; intervalDays; ease; lapses }
model TagMastery       { userId+tag @@unique; score Float; updatedAt }
model CheckpointAttempt{ id; userId; moduleId; score; passed; items Json; createdAt }
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
| `ANTHROPIC_API_KEY` | Tutor, error explainer, project review, learner gateway | **Yes for §7 / Track 2** | console.anthropic.com. Set a spend limit there too |
| `AI_TUTOR_MODEL`, `AI_REVIEW_MODEL`, `AI_FAST_MODEL` | Model choice per feature | No (defaults to `claude-opus-5`) | Your decision |
| `AI_USER_DAILY_BUDGET_USD`, `AI_MONTHLY_BUDGET_USD` | Cost caps | No (defaults 0.50 / 25) | Your decision |
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
| `ALCHEMY_API_KEY` (or any RPC URL) | Web3 module and labs | For module 19 / Web3 labs | Alchemy dashboard |

---

## 12. Delivery plan

Each milestone is shippable and leaves the app better than before.

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

---

## 13. Open decisions (owner: Raza)

1. **Existing data**: is there a production DB with progress worth keeping? If yes, content sync maps
   old lessons to new slugs by title. If no, we reset once.
2. **Audience at launch**: just you, invite-only, or public? This decides when `GRADING_MODE=server`,
   email verification, and strict cost caps become mandatory.
3. **Sandbox**: E2B (managed, pay per use, fastest to build) or a self-hosted runner (cheaper at scale,
   more ops)?
4. **LLM access for learners**: platform-paid gateway with quotas, BYOK, or both?
5. **Budget**: monthly ceiling for Claude + sandbox + hosting.
6. **Hosting**: stay on Vercel + Neon/Supabase + Upstash?
