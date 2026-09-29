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
  tracks/
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
grade: kyu          # kyu (counts down from 16) or dan (counts up from 2)
order: 1            # position among tracks
```

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
```

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
  longer than 2s…" and the line it was on; the other tests still run and report. Use
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
- **FastAPI:** test apps with `httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")`
  inside an `async def` test (`packages: [fastapi, httpx]`). Sync and async endpoints and
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
| `ScriptedLLM(replies, supports_schema=True)` | A3–A8: anything that takes an `llm` | Returns `LLMResponse`s in order; `.calls` holds every `complete()` call's arguments (messages copied), so tests assert on prompts, tools offered and history; a scripted `Fail` raises `FakeLLMError` (`.status`, `.retry_after`); `supports_schema=False` makes `schema=` raise `NotImplementedError`; raises a clear error if the code calls more times than scripted |
| `fake_api({"GET /v1/deals/{id}": …})` | Slack, CRMs, sheets, any JSON API | A handler (`lambda req, id: {...}`) or a plain value; return `(status, json)` or `(status, json, headers)` for errors; `.requests` and `.calls("POST /path")` record traffic; `.async_transport` for `AsyncClient` |
| `fake_embed(texts, dim=64)`, `cosine(a, b)` | A4: RAG | Deterministic embeddings where shared (stemmed) words mean similarity, so retrieval, ranking and recall@k are testable without a model |
| `McpHarness(handle)` | A6: MCP | Drives a JSON-RPC handler like a client: `.initialize()`, `.list_tools()`, `.call_tool(name, args)`, `.list_resources()`, `.read_resource(uri)`; checks ids and `jsonrpc: "2.0"` |

A reply in a script is `"text"`, `tool_call("name", **arguments)` (or a list of them),
`Reply(text=, tool_calls=, stop_reason=, usage=)`, `Fail(429, retry_after=2)` / `Fail(500)`,
`Timeout()` (HTTP fakes raise `httpx.ReadTimeout`; `ScriptedLLM` raises `TimeoutError`), or a
function of the request that returns one of these (for replies that depend on the prompt).
`estimate_tokens(text)` is the fakes' token rule (about 4 characters per token), handy for cost drills.

Lesson examples can `from plp_fakes import ScriptedLLM` and keep their Run button. Learners who want the
fakes locally can download them from `/py/plp_fakes.py` on the site.

Lessons show real calls to `https://api.anthropic.com` and `https://api.openai.com` as
```` ```python norun ```` with the learner's own key from an environment variable, and put the
runnable version against a fake right next to them. Never hard-code a key, even a fake-looking one.

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

---

## Commands

| Command | Does |
|---------|------|
| `npm run content:validate` | Checks every file, runs every drill's solution and starter, and runs every lesson example |
| `npm run content:validate -- --only <slug>` | The same for one module, lesson or drill |
| `npm run content:validate -- --quick` | Structure only, no Python |
| `npm run content:try -- <exercise dir> [--solution]` | Shows exactly what a learner sees when running the starter (or solution) |
| `npm run content:sync` | Copies content into the database (archives removed items, keeps progress) |

## Checklist before you open a PR

- `npm run content:validate` passes.
- Each lesson's drills climb from warm-up to stretch, and at least one isn't "write a function".
- Every `##` section has something to run, check or practise.
- Sentence case in titles. No `foo`/`bar`. No emoji.
