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
timeout: 5           # seconds, optional (default 5)
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
from plp import test, hidden, run_program, source_uses
from solution import split_bill


@test("Splits evenly between three people")
def _():
    assert split_bill(90, 3) == 30


@test("Rounds each share to cents")
def _():
    assert split_bill(100, 3) == 33.33


@hidden("Refuses zero people")          # runs, but the body isn't shown to the learner
def _():
    try:
        split_bill(10, 0)
    except ValueError:
        return
    raise AssertionError("split_bill(10, 0) should raise ValueError")
```

- **Plain `assert` works.** When a comparison fails, the learner sees both sides:
  `split_bill(100, 3) returned 33.333333333333336, expected 33.33`. Add a message
  (`assert x, "..."`) when the raw comparison isn't enough on its own.
- **`run_program(stdin=["Raza", "3"])`** runs the learner's file as a script with those input lines
  and returns everything it printed.
- **`source_uses(node="ListComp")` / `source_avoids(call="range")`** inspect the learner's code with
  `ast`, for refactor drills.
- **`async def` tests** are awaited, so asyncio code can be tested directly.
- **`pytest_run({"pricing.py": CORRECT, "test_pricing.py": solution_source()})`** runs pytest on
  those files and returns `.passed`, `.failed` and `.errors` (lists of test names). Use it for `tests`
  drills: run the learner's tests against the real module, then against each planted bug. Needs
  `packages: [pytest]`.
- **`typecheck(strict=False)`** runs mypy on the learner's code and returns `.errors` (mypy's error
  lines) and `.ok`. Needs `packages: [mypy]`.
- Each test gets its own stdout capture, so learners' `print()` calls never break a test.
- Put the edge cases in `@hidden` tests so solutions can't be written to match the visible ones.
- Write 3–8 tests per drill. The first test is the example from `prompt.md`.

### Testing HTTP, time and randomness

Keep drills deterministic:

- **HTTP:** give the learner's client an `httpx.Client(transport=httpx.MockTransport(handler))`
  from the test.
- **Time:** have functions take `now` or a clock as a parameter.
- **Randomness:** have functions accept a `random.Random` instance, or seed it in the test.
- **LLM calls:** use the fake clients in `plp.fakes` (automation track). They replay scripted
  responses and record every request, so tests can assert on prompts and tool calls.

---

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
