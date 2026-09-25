# pylearn curriculum

Status: approved plan · Last updated: 2026-09-25 · Owner: Raza Awan

Two tracks, one path, and a grade for every module:

- **Python** takes you from zero to advanced across 16 modules. Each module passed is one kyu grade,
  from 16 kyu up to 1 kyu. Passing module 16 earns the black belt, 1st dan.
- **AI Automation** takes you from Python developer to paid automation engineer across 8 modules.
  Each module passed is one dan grade, from 2nd up to 9th. It follows `AI_Automation_Roadmap_Raza_Awan.pdf`.

Content is written in the format described in [CONTENT.md](CONTENT.md). The engine that runs it is
described in [ARCHITECTURE.md §5](ARCHITECTURE.md#5-exercise-engine).

---

## What "done" means

A module is **passed** when every lesson in it is complete and its checkpoint is passed. A lesson is
**complete** when its required drills pass.

The Python track is designed so that on finishing it you can:

- Read and write idiomatic Python without looking things up constantly, and explain *why* it is idiomatic.
- Build a typed, tested, packaged Python project from an empty folder, with pytest, ruff, mypy and uv.
- Reason about what Python is actually doing: the data model, descriptors, the import system, the GIL,
  and the event loop.
- Choose between threads, processes and asyncio for a given job, and write correct concurrent code.
- Build HTTP clients and FastAPI services backed by a real database, and profile them.

The AI Automation track is designed so that on finishing it you can:

- Automate real business processes end to end, with webhooks, schedules, integrations and browser
  automation, in Python or n8n.
- Call any major LLM provider through your own provider-neutral client, and control its cost.
- Build structured extraction, tool calling, RAG, agents and MCP servers from first principles before
  reaching for a framework.
- Ship them to production with evals, tracing, retries, security against prompt injection, and cost caps.
- Package the work as case studies and sell it.

---

## Teaching rules (apply to every lesson)

1. **One idea per section, then practice it.** Every H2 section ends with a runnable example, a quick
   check or a drill. Long stretches of prose with nothing to run are a bug.
2. **Show the wrong way first when the wrong way is common.** Examples: mutable default arguments,
   `is` for comparing strings, bare `except:`, and blocking calls inside async code.
3. **"Coming from JavaScript" asides** are short: one or two sentences, only where the difference
   bites (truthiness, scope, `this` vs `self`, modules, async, equality). Beginners can skip them.
4. **Real names, real data.** Invoices, log lines, orders and API payloads, never `foo`/`bar`.
5. **Advanced means understood, not memorised.** Each advanced lesson explains the mechanism (what
   CPython does) as well as the syntax.
6. **Drills escalate.** Each lesson has 3–6 drills that climb in difficulty: *warm-up* (one line),
   *core* (the lesson's main skill), then *stretch* (combines it with earlier modules). At least one
   is a *predict*, *fix* or *refactor* drill, not just "write a function".
7. **AI lessons are provider-neutral.** Every example runs against both Anthropic and OpenAI through
   the learner's own `llm` wrapper (built in A2). Grading uses a scripted fake client, so it is
   deterministic and free.

---

## Track 1: Python (16 kyu → 1st dan)

### White belt: speak Python (modules 1–3, 16–14 kyu)

**1. Python for developers** · `python-basics` · ~6 h
Running Python (REPL, scripts, `uv run`) · names are labels on objects (`id`, `is`, mutability) ·
numbers (arbitrary-precision int, float traps, `//`, `%`, `**`, `round`, `Decimal`) · strings (slicing,
methods, f-strings with format specs, immutability) · booleans, `None` and truthiness · `input()`,
`print()` and your first program.
*Capstone:* **Receipt printer**, a program that reads line items from input and prints an aligned,
totalled receipt.

**2. Collections and control flow** · `collections-and-control-flow` · ~8 h
Lists (mutation vs new list, slicing, sorting) · tuples and unpacking (starred, swap) · dicts (views,
`get`, `setdefault`, merging with `|`) · sets · loops (`for`, `while`, `range`, `enumerate`, `zip`,
`break`/`continue`/`else`) · comprehensions (list, dict, set, nested, when not to) · `match` statements
with patterns.
*Capstone:* **Gradebook report**, which parses raw score lines and prints per-student and per-subject
stats.

**3. Functions and modules** · `functions-and-modules` · ~8 h
`def` and `return` · positional, keyword, default (the mutable-default trap), `*args`/`**kwargs`,
keyword-only and positional-only parameters · scope and LEGB, closures, `nonlocal` · functions as
values, `lambda`, `sorted(key=…)`, `map`/`filter` vs comprehensions · docstrings · modules, packages,
imports, `__name__ == "__main__"`.
*Capstone:* **Expense splitter**, a small library plus a CLI entry point that settles debts in a group.

### Yellow belt: write it the Python way (modules 4–7, 13–10 kyu)

**4. Pythonic idioms and the standard library** · `pythonic-stdlib` · ~9 h
EAFP vs LBYL · `collections` (`Counter`, `defaultdict`, `deque`, `namedtuple`, `ChainMap`) ·
`itertools` (`chain`, `groupby`, `islice`, `product`, `accumulate`, `batched`) · `functools`
(`partial`, `reduce`, `lru_cache`, `cache`) · `datetime` and `zoneinfo` · `pathlib` · `re` · `enum` ·
`json` · `random` and `statistics`.
*Capstone:* **Log analyzer**, which parses web-server logs into a report of top paths, error rates and
busiest hours.

**5. Object-oriented Python** · `oop` · ~9 h
Classes and instances · instance vs class attributes · methods, `@classmethod`, `@staticmethod` ·
`@property` and validation · inheritance, `super()`, MRO · composition over inheritance · core dunders
(`__repr__`, `__str__`, `__eq__`, ordering with `total_ordering`) · `dataclasses` (frozen, `field`,
`__post_init__`, `slots`) · `abc` · when a function or a dict beats a class.
*Capstone:* **Inventory system**, with products, stock movements and a low-stock report, using
dataclasses.

**6. Errors, files and context managers** · `errors-files-context` · ~8 h
Exceptions (`try`/`except`/`else`/`finally`, raising, re-raising, chaining with `from`) · designing a
custom exception hierarchy · exception groups and `except*` · files and encodings · `pathlib` I/O ·
CSV and JSON round trips · `with` and writing context managers (class-based and `contextlib`) ·
`logging` basics.
*Capstone:* **CSV cleaner**, which validates messy CSV input, writes a clean file plus an error report,
and never crashes on bad rows.

**7. Testing with pytest** · `testing-pytest` · ~8 h
Why tests matter and what to test · pytest functions and `assert` rewriting · fixtures and scopes ·
`parametrize` · `pytest.raises` and `approx` · `monkeypatch` and `unittest.mock` · testing I/O with
`tmp_path` · test-driven development · test design (arrange, act, assert; one behaviour per test).
Drills run real pytest in the browser.
*Capstone:* **Test a legacy module**, where an untested pricing module gets a suite that finds its
three planted bugs.

### Green belt: the advanced language (modules 8–10, 9–7 kyu)

**8. Iterators, generators and decorators** · `iterators-generators-decorators` · ~9 h
The iteration protocol (`__iter__`, `__next__`, `StopIteration`) · generators and `yield` · generator
expressions and lazy pipelines · `yield from` and delegation · `send`/`close` (briefly) · decorators
from scratch, `functools.wraps`, decorators with arguments, stacking, class decorators · generator-based
context managers.
*Capstone:* **Streaming ETL**, a lazy pipeline that processes a "large" log without loading it into
memory, instrumented with decorators.

**9. Types, Protocols and Pydantic** · `typing-pydantic` · ~9 h
Type hints and why they pay off · running mypy (in the browser) · unions, `Optional`, `Literal` ·
collections and `TypedDict` · generics with PEP 695 syntax (`def first[T](…)`, `class Box[T]`) ·
`Protocol` and structural typing · `Callable`, `ParamSpec` and `overload` · Pydantic v2 models,
validators, serialization and settings.
*Capstone:* **Typed API models**, a Pydantic schema set for an e-commerce order API that passes
`mypy --strict`.

**10. Tooling and packaging** · `tooling-packaging` · ~7 h
Virtual environments and why they exist · `uv` (projects, lockfiles, `uv run`, tools) · `pyproject.toml` ·
dependency versions and ranges · ruff for linting and formatting · mypy config · pre-commit · `logging`
configuration for applications · CLIs with `argparse` · building and publishing a package.
Local labs verify real `uv` projects.
*Capstone:* **Ship a CLI tool**, a packaged, linted, typed and tested command-line tool, installable
with `uv tool install`.

### Blue belt: how Python really works (modules 11–13, 6–4 kyu)

**11. Data model and internals** · `data-model-internals` · ~9 h
Everything is an object: types, `type()`, identity · the data model (container protocol, `__len__`,
`__getitem__`, `__contains__`, `__call__`, `__hash__` with `__eq__`) · attribute lookup, `__getattr__`
and `__getattribute__` · descriptors and how `property` works · `__slots__` · class creation,
`__init_subclass__` and metaclasses (and why you rarely need them) · the import system and module
caching · memory: reference counting, `gc`, `sys.getsizeof` · bytecode with `dis`.
*Capstone:* **A tiny ORM**, with descriptor-based fields, validation, and a registry via
`__init_subclass__`.

**12. Concurrency: asyncio, threads and processes** · `concurrency` · ~10 h
I/O-bound vs CPU-bound · the GIL and free-threaded Python (3.13+) · asyncio from the ground up
(coroutines, the event loop, tasks) · `gather`, `TaskGroup`, `timeout`, cancellation · semaphores,
queues and producer–consumer · async iterators and context managers · `concurrent.futures`
(thread and process pools) · bridging sync and async code · common bugs (blocking the loop, forgotten
`await`, race conditions).
asyncio drills run in the browser. Thread and process drills are local labs.
*Capstone:* **Concurrent fetcher**, a rate-limited async crawler over a mock API with retries and a
concurrency cap.

**13. Performance and profiling** · `performance` · ~7 h
Measure first (`timeit`, `perf_counter`, `cProfile`, `pstats`) · the cost of built-in operations ·
choosing data structures · caching and memoisation · generators for memory · string building ·
vectorising with numpy · when to reach for C, Cython or Rust (overview).
*Capstone:* **Make it fast**, which takes a slow report generator 20× faster, with a profile to prove it.

### Brown belt: build real software (modules 14–16, 3–1 kyu)

**14. HTTP and APIs** · `http-apis` · ~8 h
HTTP in five minutes (methods, status codes, headers, JSON) · `httpx` clients, sessions and timeouts ·
authentication (API keys, bearer tokens, OAuth 2 overview) · pagination (offset, cursor, link header) ·
retries with exponential backoff and jitter · rate limits and `Retry-After` · async `httpx` · designing
a typed API client class. Drills use `httpx.MockTransport`, so they are real httpx code against a
deterministic server.
*Capstone:* **API client library**, a typed, retrying, paginating client for a mock CRM API.

**15. Web services with FastAPI** · `fastapi` · ~9 h
Routes, path and query parameters · request and response models with Pydantic · status codes and
errors · dependency injection · auth (API keys, JWT overview) · background tasks · middleware ·
structuring a larger app with routers · testing with `httpx.AsyncClient` and `ASGITransport`.
Everything runs in the browser.
*Capstone:* **Webhook-ready service**, a FastAPI service with CRUD, auth and full tests. The
automation track reuses it.

**16. Data and databases** · `data-and-databases` · ~9 h
SQL fundamentals with `sqlite3` (select, join, group, index) · parameterised queries and SQL injection ·
transactions · SQLAlchemy 2.0 (engine, ORM models, sessions, relationships, queries) · migrations with
Alembic (local lab) · pandas for data work (load, clean, group, merge, export) · choosing between SQL
and pandas.
*Black belt grading:* **Job tracker**, a FastAPI + SQLAlchemy service with a pandas-powered weekly
report and a full test suite. Passing it earns 1st dan.

---

## Track 2: AI Automation (2nd dan → 9th dan)

Unlocks after the Python black belt. Early access is allowed after module 9 (types and Pydantic),
module 12 (asyncio) and module 14 (HTTP), which are the roadmap's Phase 0 prerequisites.

**A1. Automation foundations** · `automation-foundations` · 2nd dan · ~12 h · roadmap Phase 1
Automation thinking: trigger → context → decision → action, and which processes are worth
automating · file and folder automation · spreadsheets and CSV reporting · scheduling (cron,
APScheduler, GitHub Actions on a schedule) · webhooks: receiving them in FastAPI, verifying HMAC
signatures, idempotency and retries · integrating SaaS APIs (email, Slack, Google Sheets, Airtable) ·
subprocess and Docker basics · browser automation with Playwright (local lab) · n8n: nodes, triggers,
credentials, and calling your own Python service (local labs, verified by webhook).
*Capstone:* **Lead capture pipeline**: form webhook → validate → enrich → CRM → Slack alert, built once
in Python and once in n8n.

**A2. LLM fundamentals** · `llm-fundamentals` · 3rd dan · ~10 h · roadmap Phase 2
How LLMs work, just enough (tokens, context windows, sampling, temperature) · the Anthropic Messages
API and the OpenAI API side by side · building your provider-neutral `llm` client (one interface,
two adapters) · prompting that works (roles, system prompts, examples, delimiters, output constraints) ·
streaming · counting tokens and tracking cost per call · choosing a model by task, speed and cost ·
errors, rate limits and retries.
*Capstone:* **Model comparison harness**, which runs one task across providers and models and reports
quality, latency and cost.

**A3. Structured output and tool calling** · `structured-output-tools` · 4th dan · ~10 h · roadmap Phase 2
Why free text breaks automations · JSON output, validated with Pydantic, with a repair-and-retry loop ·
native structured outputs on each provider · classification and extraction pipelines · tool calling by
hand (schemas, the dispatch loop, returning results and errors) · multiple and parallel tool calls ·
designing good tools.
*Capstone:* **Support triage service**, which reads tickets, extracts fields, classifies urgency, calls
tools to look up orders, and drafts a reply.

**A4. Retrieval (RAG)** · `rag` · 5th dan · ~12 h · roadmap Phase 3
Embeddings and cosine similarity (numpy) · chunking strategies and their trade-offs · vector search
from scratch, then pgvector (local lab) · keyword search with BM25 and hybrid retrieval · reranking ·
grounded answers with citations · evaluating retrieval (recall@k, MRR) and answers · RAG failure modes
and fixes.
*Capstone:* **Docs chatbot**, which answers questions about a document set with citations and a
retrieval eval above a target score.

**A5. Agents** · `agents` · 6th dan · ~12 h · roadmap Phase 4
What an agent is, and when a workflow is better · the agent loop from scratch (~80 lines) · tool
design for agents · memory (conversation, summaries, long-term stores) · planning and reflection ·
workflow patterns (prompt chaining, routing, parallelisation, orchestrator–workers,
evaluator–optimiser) · human-in-the-loop approvals · guardrails (step caps, budgets, timeouts) ·
frameworks overview, and when not to use one.
*Capstone:* **Research agent**, which searches, reads and summarises with citations under a hard cost cap.

**A6. MCP** · `mcp` · 7th dan · ~8 h · roadmap Phase 4
The Model Context Protocol (tools, resources, prompts, transports) · building an MCP server with the
official Python SDK · testing servers · connecting servers to clients (Claude Desktop, IDEs, your own
agent) · security: least privilege, input validation, secrets. Protocol logic is drilled in the
browser; running servers is a local lab.
*Capstone:* **Business MCP server**, which exposes a company's orders and docs to any MCP client,
read-only and audited.

**A7. Production AI systems** · `production` · 8th dan · ~12 h · roadmap Phase 5
Evals (golden datasets, LLM-as-judge, regression suites in CI) · tracing and observability ·
reliability (timeouts, retries, fallbacks, idempotency, queues) · cost control (caching, prompt
caching, model routing, budgets) · prompt injection and data exfiltration defences · deploying AI
services (Docker, background workers, secrets) · monitoring and alerting.
*Capstone:* **Harden and deploy**: take your best earlier project to production with evals, tracing,
cost caps and a red-team report.

**A8. Portfolio and client work** · `portfolio-clients` · 9th dan · ~8 h · roadmap Phase 6
Finding automation opportunities and estimating ROI · scoping and pricing projects · proposals and
statements of work · discovery calls (practised with the tutor) · delivery, handover and maintenance
retainers · writing case studies · a portfolio that sells.
*Capstone:* **Three case studies and an offer**, published and ready to send.

---

## Beyond the roadmap: additions

These additions make the tracks complete for anyone, not only the original roadmap:

- **Python module 4 (idioms and stdlib), module 11 (internals) and module 13 (performance)** are what
  separate "can write Python" from "advanced". The old course did not cover them properly.
- **Module 7 runs real pytest** and **module 9 runs real mypy** in the browser, so testing and typing
  are practised, not only read about.
- **A1 covers scheduling, SaaS integrations and Docker** alongside n8n, because clients ask for those
  as often as for workflow tools.
- **A7 includes security against prompt injection** and **A8 includes pricing and ROI**. The roadmap
  mentions both, and both are essential to paid work.
- **Every module has a checkpoint**: 5–8 fresh problems, no hints, 80% to pass. See
  [ARCHITECTURE.md §6](ARCHITECTURE.md#6-learning-design-how-confidence-gets-built).

## Removed

- **Web3 with Python** is gone, along with its module, lessons, capstone, achievements, starter
  template and environment variables.
- The old "DevOps & Automation" module is folded into modules 10 and A1.
- The old "Web Development" module is split into modules 14 and 15.
- The old "Data Processing" module is folded into module 16.
