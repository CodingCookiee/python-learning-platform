# Writing content for pylearn

Every lesson, drill and capstone is a file in `content/`. The files are the source of truth: the
database is a copy, refreshed with `npm run content:sync`. `npm run content:validate` checks every
file, and runs every drill's solution and starter against its tests, before anything reaches
learners.

What to teach is in [CURRICULUM.md](CURRICULUM.md). This file covers how to write it.

---

## Layout

```
content/
  achievements.yaml                # the badges (see below)
  tracks/
    start/                         # the beginner on-ramp: no grade, before Python
      track.yaml
      01-programming-from-zero/
        ...
    python/
      track.yaml
      01-python-basics/            # NN- prefix sets the module's order in the track
        module.yaml
        lessons/
          01-running-python.md     # NN- prefix sets the lesson's order in the module
          02-names-and-objects.md
        exercises/
          greet-by-name/           # folder name = exercise slug
            exercise.yaml
            prompt.md
            starter.py
            solution.py
            tests.py
        capstone/
          capstone.yaml
          brief.md
          starter.py               # optional starter template
    automation/
      track.yaml
      01-automation-foundations/
        ...
```

**Slugs are forever.** Progress is keyed to slugs, so renaming a slug looks like deleting the old
item and adding a new one. Change titles freely; change slugs only before anyone has used them.
Slugs are lowercase kebab-case and unique across the whole platform. Prefix exercise slugs with the
module when a name could clash, for example `oop-bank-account`.

Removing a file archives the item: learners' history stays and the item disappears from the syllabus.

---

## `track.yaml`

```yaml
slug: python
title: Python
summary: From zero to advanced, one kyu grade per module.
grade: kyu          # kyu (counts down from 16), dan (counts up from 2), or none
order: 1            # position among tracks (the Start on-ramp is 0)
```

A `grade: none` track gives no grade, has no checkpoint (finishing a module's lessons passes it,
whatever its `checkpoint` settings) and never gates another track: modules unlock in order within
their own track, and rank, the black belt and pacing read the Python track by slug. The Start
on-ramp (`content/tracks/start/`) is the one such track.

## `achievements.yaml`

The badges, each with a slug, name, description, icon (a lucide name), category, tier (bronze,
silver, gold), XP and `criteria`. `content:sync` loads them; `lib/achievements.ts` checks them after
anything that could earn one. Criteria:

| `kind` | Fields | Earned when |
|--------|--------|-------------|
| `lessons` | `count` | that many lessons are complete |
| `drills` | `count` | that many different drills are passed |
| `modules` | `modules: [slugs]` | every listed module is passed |
| `capstone` | `module` | that module's capstone is approved or its acceptance tests passed |
| `black-belt` | | the black belt is earned |
| `streak` | `days` | the streak has reached that many days |
| `xp` | `amount` | the learner has that much XP |
| `module-lessons` | `module`, `count` | that many lessons of one module are complete |
| `drill-type` | `type`, `count` | that many different drills of one type (`function`, `program`, `predict`, `fix`, `refactor`, `tests`) are passed |
| `quest` | `quest` | that quest is finished (`first-session` is the only one: Ready to Train) |

## `module.yaml`

```yaml
slug: python-basics
title: Python for developers
summary: Run Python, name things, and work with numbers, strings and truthiness.   # one line
description: >
  A paragraph for the module page: what this module covers and why it matters.
hours: 6
outcomes:            # "By the end you can…", 3–6 items, each a concrete skill
  - Explain the difference between == and is, and when each is right
  - Format numbers and text precisely with f-strings
checkpoint:          # optional; these are the defaults
  pick: 6            # drills per attempt, spread across the lessons (20 minutes each)
  pass_mark: 0.8
  pool: []           # drill slugs to draw from; empty means every core and stretch drill that isn't predict
```

The checkpoint is what passes a module, so its pool should cover the outcomes. The default pool
usually does. Set `pool` when some core drills are too easy to remember or depend on another drill,
and list at least `pick` of them. Every drill that isn't a warm-up or a predict drill also feeds
spaced review once solved, so write their prompts to stand alone (a review shows the drill by itself,
without its lesson).

## Lessons: `lessons/NN-slug.md`

```markdown
---
slug: names-and-objects
title: Names, objects and types
summary: Variables are labels on objects, which is why some changes show up in two places.
minutes: 25
exercises:           # drill slugs, in order; all are required to complete the lesson
  - rebind-or-mutate
  - swap-without-temp
optional:            # optional extra practice, not required
  - identity-quiz
lab:                 # optional: how the lesson's local lab ("Do it on your machine") is verified
  title: Lead intake in n8n
  kind: webhook      # webhook | url | output
  instructions: >-   # one to three plain sentences (shown as text, so no backticks)
    Add an HTTP Request node on the IF node's true branch that POSTs the lead to your lab URL.
  expect:            # webhook, and optionally url: dot paths the JSON body must contain, exact values
    email: amira@example.com
    priority: high
---

Opening paragraph: the problem this lesson solves, in one or two sentences.

## First idea
...
```

- Don't repeat the title as a `#` heading; the page already shows it. Start sections at `##`.
- Aim for 800–2000 words. Short sections, each ending with something to run or check.

### Code blocks

````markdown
```python
# Runs in the browser with a Run button (stdlib only). Each run starts fresh.
prices = [4.5, 12.0, 3.25]
sum(prices)
```

```python norun
# Shown only, no Run button (for code that needs files, the network or a server)
```

```python raises
# Runnable, and meant to fail: shows the learner a real error message.
# The validator checks that it really does raise.
"total: " + 42
```

```text
Plain output or shell text
```

```bash
uv run main.py
```
````

The value of the last expression and any new or changed variables are shown under the output, as in
a REPL, so examples don't need `print()` everywhere.

### Callouts

```markdown
> [!JS]
> Coming from JavaScript: there is no `undefined`. A missing dict key raises `KeyError`.

> [!NOTE]
> A useful aside.

> [!WARNING]
> A common mistake and its consequence.

> [!TIP]
> A shortcut or habit worth building.
```

Keep `[!JS]` asides to one or two sentences, and only where the difference trips people up.

### Quick checks

A multiple-choice question inside the lesson. It isn't graded, but it does explain the answer.

````markdown
```quiz
question: What does `[1, 2] * 2` evaluate to?
options:
  - "[2, 4]"
  - "[1, 2, 1, 2]"
  - "TypeError"
answer: 1            # zero-based index of the correct option
explain: Multiplying a list repeats it. Use a comprehension to double each item.
```
````

---

## Exercises (drills)

### `exercise.yaml`

```yaml
title: Swap without a temporary variable
type: function       # function | program | predict | fix | refactor | tests
difficulty: core     # warm-up | core | stretch
xp: 20               # optional; defaults: warm-up 10, core 20, stretch 30
tags: [unpacking, tuples]   # concept tags for the skill map
packages: []         # Pyodide packages to load, e.g. [numpy], [pydantic], [pytest]
timeout: 5           # seconds for the whole run, optional (default 5); each test also has its own limit
script: false        # optional: true makes a fix/refactor drill a script (tests use run_program(),
                     # the code isn't imported). Always true for program and tests drills.
hints:               # revealed one at a time; the last hint is the closest to the answer
  - Python can assign to several names at once.
  - "a, b = b, a"
```

| Type | The learner… | `starter.py` | Graded by |
|------|--------------|--------------|-----------|
| `function` | writes a function or class | signature + docstring, body `...` | `tests.py` calling their code |
| `program` | writes a script using `input()`/`print()` | a comment or a skeleton | `tests.py` using `run_program()` |
| `fix` | repairs broken code | the broken code | `tests.py` |
| `refactor` | rewrites working code idiomatically | the working but clumsy code | `tests.py`, often with `source_uses()` checks |
| `predict` | says what code prints | the code to predict | the learner's answer compared with the real output |
| `tests` | writes pytest tests for given code | a test file skeleton | `tests.py` using `pytest_run()`: the learner's tests must pass on the correct code and fail on planted bugs |

- **`prompt.md`** is the task, in markdown. State the function signature, the input and the output,
  and give one worked example. Don't give away the approach; that's what hints are for.
- **`solution.py`** is a clean, idiomatic reference answer. Learners see it only after solving the
  drill or giving up.
- **`starter.py`** must fail at least one test (the validator checks this).
- **`predict`** drills need only `starter.py` (the code) and no tests. The expected answer is the real
  stdout of running it.

### Multi-file drills

When a drill is about how code is split across files (modules, packages, a script reading a data
file), give it other files. They appear as tabs next to the main file:

```yaml
main_file: main.py           # the tab name for starter.py / solution.py (default main.py)
files:
  - path: pricing.py         # starter: files/pricing.py; solution: solution-files/pricing.py
  - path: inventory/__init__.py
  - path: inventory/stock.py
    editable: false          # given and locked: the learner reads it but can't change it
  - path: orders.csv
    editable: false
```

- Starter content goes in `files/<path>`. An editable file's solution version goes in
  `solution-files/<path>`; leave it out when the solution doesn't change the file.
- `.py` files are importable by their module path (`import pricing`, `from inventory.stock import
  reorder`), and other files are readable from the working directory (`open("orders.csv")`).
- The main file is still imported as `solution`, so tests use `from solution import ...` as usual and
  can import the other modules directly (`import pricing`). `defined_names` and `source_uses` look at
  the main file only.
- `learner_files()` returns the other files as the learner left them (`{"conftest.py": "..."}`),
  for checks that read them as text or hand them to `pytest_run`.
- Tabs that aren't `.py` get the matching editor mode: `.toml`, `.ini` and `.cfg` as ini, `.json`,
  `.md` and `.yaml`; anything else as plain text.
- `tests` drills can be multi-file too, with the learner's test file as the main file. Pass the
  other files to `pytest_run` yourself: `SUPPORT.update({"conftest.py": learner_files()["conftest.py"]})`.
  Files you write in `pytest_run` win over the learner's copies of the same name, so planted bugs
  still reach their tests.
- The validator runs the solution with the solution files and the starter with the starter files.
  Worked examples: `03-functions-and-modules/exercises/imports-split-pricing` (modules),
  `07-testing-pytest/exercises/pytest-shared-conftest` (a conftest.py and a teammate's test file),
  `07-testing-pytest/exercises/pytest-tdd-slug` (code and tests written together),
  `10-tooling-packaging/exercises/logconf-config-file` and `tooling-tool-table` (TOML files the
  code reads).

### `tests.py`

The learner's code is importable as `solution`. Tests are plain functions registered with
decorators from `plp`:

```python
from plp import test, hidden, raises
from solution import split_bill


@test("Splits evenly between three people")
def _():
    assert split_bill(90, 3) == 30


@test("Rounds each share to cents")
def _():
    assert split_bill(100, 3) == 33.33


@hidden("Refuses zero people")          # runs, but the body isn't shown to the learner
def _():
    with raises(ValueError, match="at least one"):
        split_bill(10, 0)
```

- **Plain `assert` works.** When a comparison fails, the learner sees both sides:
  `split_bill(100, 3) returned 33.333333333333336, expected 33.33`. Each side is evaluated once
  (asserts are rewritten before running), so the message shows exactly the values that were
  compared, even when the code mutates or prints. `assert a and b` is split into two checks that
  each explain themselves. Add a message (`assert x, "..."`) when the raw comparison isn't enough.
- **Put the call inside the assert.** `assert split_bill(90, 3) == 30` reads "split_bill(90, 3)
  returned …"; `result = split_bill(90, 3)` then `assert result == 30` only says "result is …".
  The same goes for `run_program(...)`: inside the assert, a failure reads "Your program printed …".
- **`raises(ValueError, fn, *args, match=None)`** or **`with raises(ValueError, match="regex", what="split_bill(10, 0)"):`**
  checks for an exception (and optionally its message). Prefer the call form: its failure message
  names the call; give the block form `what=` for the same effect. An exception of a different type
  is reported as the learner's error. For coroutines, `await raises_async(Error, client.fetch, "1042", match=…)`.
- **Fake HTTP servers:** use `fake_api({...})` from `plp_fakes` (see the automation section below): it
  records every request and scripts statuses and headers, in any module, not only the AI track.
- **`run_program(stdin=["Raza", "3"])`** runs the learner's file as a script with those input lines
  and returns everything it printed (`.lines` gives non-blank lines, trailing spaces stripped).
  `run_program(source=...)` runs a modified copy, e.g. with a constant changed. `argv=[...]` sets
  `sys.argv[1:]`; a `SystemExit` is caught, so `.exit_code` and `.stderr` sit alongside the output.
- **`call_main(main, ["report", "--format", "csv"])`** calls a CLI entry point the way a shell
  would and returns `.code` (return value or `SystemExit` code; argparse errors are 2), `.out`,
  `.lines` and `.err`.
- **`with captured_logs("solution") as logs:`** captures log records (`.messages`, `.levels`, `.text`).
  Logging is reset to its start-up state before every test, so configuration never leaks between
  tests or runs (`fresh_logging()` does the same on demand).
- **`load_module("billing")`** imports a fresh copy of the learner's file under that name (so the
  `__main__` guard is false) and returns it with `.printed`: use it to check a file has no
  side effects on import.
- **`with modules({"customers.py": CUSTOMERS, "orders.py": solution_source()}):`** puts several
  files on the import path for multi-file drills (imports, packages, circular imports) and cleans
  up afterwards. Each run also starts with a clean import state: modules created by earlier runs
  are gone, so examples don't need to clear `sys.modules` themselves.
- **`defined_names("function" | "class" | "any")`** lists what the learner's file defines at the top
  level (methods as `Class.method`).
- **Time limits.** Each test may spend 2 seconds in the learner's code before it fails with "Took
  longer than 2s…" and the line it was on (loading the learner's file gets 3 s, or 10 s when it imports a
  heavy framework such as FastAPI, pandas, SQLAlchemy or numpy); the other tests still run and report. Use
  `@test("…", timeout=10)` for a slower check, or `timeout=None` for timing measurements (the
  limit's tracer slows learner code slightly). This makes "make it faster" drills possible: a
  large input simply times out on the slow version. The limit covers code in the learner's file and inside test
  functions; build large inputs at the top level of `tests.py`, which runs once and isn't timed.
- **`source_uses(node="ListComp")` / `source_avoids(call="range")`** inspect the learner's code with
  `ast`, for refactor drills. `call=` and `name=` match both `pairwise` and `itertools.pairwise`,
  and names brought in with `from x import y`.
- **`async def` tests** are awaited, so asyncio code can be tested directly.
- **`pytest_run({"pricing.py": CORRECT, "test_pricing.py": solution_source()})`** runs pytest on
  those files and returns `.passed`, `.failed` and `.errors` (lists of test names). Use it for `tests`
  drills: run the learner's tests against the real module, then against each planted bug. Needs
  `packages: [pytest]`. Time inside `pytest_run` and `typecheck` doesn't count against the per-test
  limit. `result.explain()` gives one line per failing test (pytest's `E` lines) for messages like
  `assert not r.failed, r.explain()`. Always pass `--capture=sys` if you ever call `pytest.main`
  yourself: fd-level capture crashes Pyodide (`pytest_run` does this for you).
- **`typecheck(strict=False)`** runs mypy on the learner's code and returns `.errors` and `.notes`
  (mypy's lines; `reveal_type` output is a note), `.ok`, and `.errors_on(line)` / `.notes_on(line)`.
  Results are cached per source, so every test can call `typecheck()` and only the first pays
  (a run takes several seconds in the browser); mypy's time doesn't count against the per-test
  limit. Needs `packages: [mypy]` and a drill `timeout` of about 30.
- Each test gets its own stdout capture, so learners' `print()` calls never break a test.
- Put the edge cases in `@hidden` tests so solutions can't be written to match the visible ones.
- Write 3–8 tests per drill. The first test is the example from `prompt.md`.

Errors in Run output (and in drill results) keep their full story: chained exceptions (`raise …
from exc`) and exception groups print the way CPython prints them, trimmed to the learner's own
files, so lessons don't need to print `traceback.format_exception` by hand.

### Testing HTTP, time and randomness

Keep drills deterministic:

- **HTTP:** give the learner's client an `httpx.Client(transport=httpx.MockTransport(handler))`
  from the test.
- **Time:** have functions take `now` or a clock as a parameter. `zoneinfo` works in drills and
  lesson examples (its tzdata package loads automatically).
- **FastAPI:** test apps with `async with asgi_client(app) as client:` (from `plp`; the same as
  `httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")`) inside an `async def` test (`packages: [fastapi, httpx]`). Sync and async endpoints and
  dependencies both work: the runner makes anyio run thread-pool work inline in the browser.
  `fastapi.testclient.TestClient` does **not** work (it needs a real thread); don't use it in drills.
- **Databases:** `sqlite3` and SQLAlchemy 2.0 (`packages: [sqlalchemy]`) work against in-memory
  SQLite (`sqlite://`). Scripts run as a real `__main__` module, so declarative models, dataclasses
  and pickle behave as in a normal file.
- **Randomness:** have functions accept a `random.Random` instance, or seed it in the test.
- **LLM calls:** use the fake clients in `plp_fakes` (automation track). They replay scripted
  responses and record every request, so tests can assert on prompts and tool calls.

---

## The automation track: the neutral LLM interface and the fakes

Every AI drill is graded offline with no API key. Learners **build** a provider-neutral client in A2
(one interface, an Anthropic adapter and an OpenAI adapter, over plain `httpx`). Every later module
**takes** an object with that interface, so agents, RAG and tool loops are testable with a scripted
fake. Use this interface exactly, so the modules fit together.

### The interface (as learners write it in A2)

```python norun
@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict            # already parsed from JSON

@dataclass
class Usage:
    input_tokens: int
    output_tokens: int

@dataclass
class LLMResponse:
    text: str                  # "" when the model only called tools
    tool_calls: list[ToolCall]
    stop_reason: str           # "end_turn" | "tool_use" | "max_tokens"
    usage: Usage
    model: str

class LLM(Protocol):
    def complete(self, messages: list[dict], *, system: str | None = None,
                 tools: list[dict] | None = None, model: str | None = None,
                 max_tokens: int = 1024, temperature: float | None = None) -> LLMResponse: ...
```

- **Messages** are neutral dicts: `{"role": "user", "content": "…"}`,
  `{"role": "assistant", "content": "…", "tool_calls": [{"id", "name", "arguments"}]}` and
  `{"role": "tool", "tool_call_id": "…", "content": "…"}`. The adapters translate these into each
  provider's format (Anthropic `tool_use`/`tool_result` blocks, OpenAI `tool_calls` with JSON-string
  `arguments`).
- **Tools** are neutral: `{"name", "description", "parameters": <JSON schema>}`. Anthropic calls the
  schema `input_schema`; OpenAI wraps it as `{"type": "function", "function": {...}}`.

### The fakes (`from plp_fakes import …`, no package needed except `httpx` for HTTP-level fakes)

| Fake | For | Use |
|------|-----|-----|
| `anthropic_api(replies)` / `openai_api(replies)` | A2: the learner's own HTTP adapters | `httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")`. It answers like the real endpoint (`POST /v1/messages` or `/v1/chat/completions`), checks auth headers (401), `max_tokens` for Anthropic (400), rejects `role: "system"` in Anthropic `messages` (400), supports `"stream": true` with real SSE events (text and tool calls, `ping`, OpenAI `stream_options.include_usage`), and records `.requests` / `.last` (method, path, headers, parsed `json`) |
| `ScriptedLLM(replies, supports_schema=True, repeat_last=False)` | A3–A8: anything that takes an `llm` | Returns `LLMResponse`s in order; `.calls` holds every `complete()` call's arguments (messages copied), so tests assert on prompts, tools offered and history; a scripted `Fail` raises `FakeLLMError` (`.status`, `.retry_after`); `supports_schema=False` makes `schema=` raise `NotImplementedError`; raises a clear error if the code calls more times than scripted |
| `AsyncScriptedLLM(replies, delay=0.01)` | Async agents and parallel workflows | `await llm.complete(...)`; calls overlap for `delay` seconds and `.max_in_flight` records peak concurrency |
| `fake_api({"GET /v1/deals/{id}": …})` | Slack, CRMs, sheets, any JSON API | A handler (`lambda req, id: {...}`) or a plain value; return `(status, json)` or `(status, json, headers)` for errors; `.requests` and `.calls("POST /path")` record traffic; `.async_transport` for `AsyncClient` |
| `embeddings_api("openai" | "voyage")` | A4: a learner's real embedding adapter | HTTP fake of `POST /v1/embeddings` returning `fake_embed` vectors in the provider's response shape; checks the bearer header |
| `fake_embed(texts, dim=64)`, `cosine(a, b)` | A4: RAG | Deterministic embeddings where shared (stemmed) words mean similarity, so retrieval, ranking and recall@k are testable without a model |
| `McpHarness(handle, protocol="2026-07-28")` | A6: MCP | Drives a JSON-RPC handler like a client. **Stateless (2026-07-28+):** no handshake; every request carries `_meta` (`io.modelcontextprotocol/protocolVersion`, `clientCapabilities`, `clientInfo`); `.discover()` calls `server/discover`; results must carry `resultType`. **Handshake (older protocols, the default `2025-06-18`):** `.initialize()`. Both: `.list_tools()`, `.call_tool(name, args)`, `.list_resources()`, `.list_resource_templates()`, `.read_resource(uri)`, `.list_prompts()`, `.get_prompt(name, args)`, `.request(method, params, id=…)` for custom ids, `.send(raw)` for malformed messages |

A reply in a script is `"text"`, `tool_call("tool_name", **arguments)` (or a list of them; use
`tool_call("lookup", arguments={"name": …})` for argument names that clash),
`Reply(text=, tool_calls=, stop_reason=, usage=)`, `Fail(429, retry_after=2)` / `Fail(500)`,
`Timeout()` (HTTP fakes raise `httpx.ReadTimeout`; `ScriptedLLM` raises `TimeoutError`), or a
function of the request that returns one of these (for replies that depend on the prompt).
`estimate_tokens(text)` is the fakes' token rule (about 4 characters per token), handy for cost drills.

Lesson examples can `from plp_fakes import ScriptedLLM` and keep their Run button. Learners who want the
fakes locally can download them from `/py/plp_fakes.py` on the site.

Lessons show real calls to `https://api.anthropic.com` and `https://api.openai.com` as
```` ```python norun ```` with the learner's own key from an environment variable, and put the
runnable version against a fake right next to them. Never hard-code a key, even a fake-looking one.

### Labs

A `lab:` block turns a lesson's "Do it on your machine" section into something the platform can
confirm. The lesson page shows a lab panel under the lesson; verifying earns 15 XP and never blocks
completion.

- **webhook**: the learner gets a personal URL and their workflow, script or scheduled job POSTs JSON
  to it. Every `expect` path must match exactly. Pick values that only a correct run produces (the
  lesson's own sample data, a computed score), and say in `instructions` what to send.
- **url**: the platform fetches `<learner's https URL>` + `path` from the internet (localhost and
  private networks are refused), then checks `contains` and `expect`. Only for labs that deploy
  something public.
- **output**: the learner pastes a command's output (`command`), and every regular expression in
  `patterns` must match (multiline). Write them in single quotes and keep them robust to versions
  and timings (`\d+ passed`). This is honour-system checking; it confirms the steps were followed.
- **github**: the learner pushes their project to a public GitHub repository and the checks run there
  (see "Tests that run in GitHub Actions" below). The checks are pytest files in
  `labs/<lesson-slug>/tests/` inside the module folder, with a `reference/` project beside them;
  `requirements` lists packages the checks need (`[ruff, mypy]`). Prefer this kind whenever the lab
  produces a project: it's the only one that can't be faked by pasting text. Module 10's labs use it.

End the lab section with a one-line **Check it:** step telling the learner what to send or paste.

## Capstones

`capstone/capstone.yaml`:

```yaml
slug: receipt-printer
title: Receipt printer
summary: Read line items from input and print an aligned, totalled receipt.
hours: 3
xp: 150
requirements:          # what to build
  - Reads "name, quantity, unit price" lines until a blank line
criteria:              # how it's graded (the reviewer's checklist)
  - Totals are correct to the cent
```

`brief.md` is the full project brief: the scenario, the requirements in detail, a sample run, stretch
goals, and how to submit. `starter.py` is optional.

`acceptance/` holds the capstone's acceptance tests (`test_*.py`) and `reference/` a reference
solution for checking them. Packages the tests need beyond the learner's project go in
`capstone.yaml`:

```yaml
acceptance:
  requirements: [httpx]
```

### Tests that run in GitHub Actions

Capstone acceptance tests and `github` labs run in the learner's own public repository, on every
push, through a workflow file pylearn generates for them (`.github/workflows/pylearn.yml`). The
workflow installs their project (`pyproject.toml` and/or `requirements.txt`), downloads the tests
into `.pylearn/`, installs pytest (8.4 or later) plus the suite's `requirements`, and runs:

```text
python -P -m pytest .pylearn -c .pylearn/pytest.ini --rootdir . --noconftest --disable-plugin-autoload -p no:cacheprovider
```

The repository root is the working directory and is importable. `-P` stops a file in the learner's
repo (a `pytest.py`) standing in for pytest. `--noconftest` means the learner's conftest.py can't
interfere, and neither can yours: keep fixtures and helpers inside the test files. Plugins aren't
auto-loaded either, so a suite can't rely on one (pytest-asyncio and the like): write async tests as
plain functions that call `asyncio.run`. A suite that runs the learner's own tests in a subprocess
still gets their plugins, because the flag doesn't pass to subprocesses.

The app only counts a run after GitHub's API confirms it ran the unmodified workflow in the connected
repo and succeeded. Once a run has passed, it stays passed: later failing runs, and reports posted
with the (public) token, don't take it away. This raises the bar for faking a pass, but can't rule it
out: the learner's own code runs in the same environment as the tests. The examiner's review is the
real check.

Writing the tests:

- Test what the brief states precisely (file names, functions, commands, exact messages), black-box
  where you can: run the program with `subprocess.run([sys.executable, "app.py", ...], input=...)`,
  import the functions the brief names, use `tmp_path`. Leave style and design to the examiner.
- No network and no API keys. Inject fakes through the seams the brief specifies (the automation
  track's `complete()` interface, `httpx.MockTransport`, FastAPI's `TestClient`).
- Write assertion messages for the learner: they read them on the capstone page.
- If the brief doesn't pin down what the tests need, add a short "How it's tested" section to it.
- Every suite has a `reference/` solution, laid out like a learner's repo, that is never published.
  `npm run content:acceptance` runs the suite against it (all must pass) and against an empty
  project (none may pass), with Python on your machine.

---

## Commands

| Command | Does |
|---------|------|
| `npm run content:validate` | Checks every file, runs every drill's solution and starter, and runs every lesson example |
| `npm run content:validate -- --only <slug>` | The same for one module, lesson or drill |
| `npm run content:validate -- --quick` | Structure only, no Python |
| `npm run content:try -- <exercise dir> [--solution]` | Shows exactly what a learner sees when running the starter (or solution) |
| `npm run content:acceptance` | Runs every capstone and github-lab suite against its reference/ solution and an empty project, with local Python |
| `npm run content:acceptance -- --only <slug>` | The same for one capstone or lab |
| `npm run content:sync` | Copies content into the database (archives removed items, keeps progress) |

## Checklist before you open a PR

- `npm run content:validate` passes.
- Each lesson's drills climb from warm-up to stretch, and at least one isn't "write a function".
- Every `##` section has something to run, check or practise.
- Sentence case in titles. No `foo`/`bar`. No emoji.
