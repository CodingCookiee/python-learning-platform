---
slug: code-quality-tools
title: Ruff, mypy and pre-commit
summary: Lint and format with ruff, configure mypy per module, and run both before every commit with pre-commit.
minutes: 40
exercises:
  - tooling-noqa-codes
  - tooling-bare-except-rule
  - tooling-fix-lint-findings
  - tooling-mypy-overrides
  - tooling-mutable-default-rule
lab:
  title: Clean under ruff and strict mypy
  kind: output
  instructions: >-
    Once you've fixed everything ruff and mypy reported in main.py, run the command below in your
    invoicer project and paste its output. Both tools must come back clean.
  command: uv run ruff check; uv run mypy main.py
  patterns:
    - 'All checks passed!'
    - 'Success: no issues found in \d+ source files?'
---

Code review time is expensive, and too much of it goes on things a program could have spotted: an
unused import, a bare `except:` swallowing a typo, a mutable default argument, quotes that don't
match the rest of the file. This lesson hands those jobs to three tools. **ruff** lints and formats,
**mypy** checks types (you met it in module 9; here you configure it for a whole project), and
**pre-commit** runs them on every commit, so problems never reach a reviewer.

## Bugs a linter can see

Here's a bug that runs without any error at all:

```python
def parse_quantity(text):
    try:
        return int(txt)      # typo: txt, not text
    except:
        return 0

parse_quantity("12")
```

The typo raises `NameError`, the bare `except:` catches it along with everything else, and every
quantity quietly becomes 0. Nobody finds out until the invoices are wrong. A linter reads the code
without running it and reports patterns like this. Add ruff to the project and run it:

```bash
uv add --dev ruff
uv run ruff check --output-format concise
```

```text
src/invoicer/totals.py:1:8: F401 [*] `os` imported but unused
src/invoicer/totals.py:9:5: E722 Do not use bare `except`
src/invoicer/totals.py:13:23: E711 Comparison to `None` should be `cond is None`
Found 3 errors.
[*] 1 fixable with the `--fix` option.
```

Each line is `file:line:column: CODE message`. (Without `--output-format concise`, ruff also prints
each offending line with a marker under the problem.) `uv run ruff check --fix` applies the fixes
that are safe to automate, and `uv run ruff rule E722` explains a rule and why it exists.

## How a linter sees your code

ruff is written in Rust, but the idea is the same as Python's own `ast` module: parse the source
into a tree, then walk it looking for shapes. A bare `except:` is an `ExceptHandler` node with no
exception type:

```python
import ast

source = """
def parse_quantity(text):
    try:
        return int(text)
    except:
        return 0
"""

tree = ast.parse(source)
[(node.lineno, node.col_offset + 1) for node in ast.walk(tree) if isinstance(node, ast.ExceptHandler) and node.type is None]
```

That's the whole of rule E722: line 5, column 5. Two of the drills build rules like it.

## Choosing rules

By default ruff enables a small, uncontroversial set: `E4`, `E7`, `E9` and `F`. Most projects
select more in `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "W", "F", "I", "B", "UP", "SIM"]
ignore = ["E501"]           # line length is the formatter's job

[tool.ruff.lint.per-file-ignores]
"__init__.py" = ["F401"]    # re-exporting names is what __init__.py is for
```

| Prefix | From | Catches |
|--------|------|---------|
| `F` | Pyflakes | unused imports and variables, undefined names |
| `E`, `W` | pycodestyle | style errors and warnings, including `E722` and `E711` |
| `I` | isort | import order |
| `B` | flake8-bugbear | likely bugs, such as `B006`, a mutable default argument |
| `UP` | pyupgrade | old syntax, like `typing.List[int]` where `list[int]` works |
| `SIM` | flake8-simplify | code that can be simpler |

A selector is a prefix: `"E"` enables every `E` rule, `"E7"` only the `E7xx` ones. When `select` and
`ignore` both match a rule, the more specific one wins, so `ignore = ["E501"]` switches off one
rule out of the `E` you selected. ruff works out the Python version to target from
`requires-python`, so you don't need to repeat it.

When one line really is an exception, say so on that line, naming the rule:

```python
import json

def load_settings(text):
    try:
        return json.loads(text)
    except:  # noqa: E722  (a plugin can raise anything; fall back to defaults)
        return {}

load_settings("{not json")
```

```quiz
question: With `select = ["E", "F"]` and `ignore = ["E501", "F401"]`, which of these does ruff report?
options:
  - E501 (line too long)
  - F401 (unused import)
  - E722 (bare except)
answer: 2
explain: E722 is selected by "E" and isn't ignored. E501 and F401 are selected by a prefix but ignored by name, and the more specific selector wins.
```

## Formatting

Linting finds problems; **formatting** ends arguments. `ruff format` rewrites your files in one
consistent style (the same style as Black): double quotes, trailing commas in exploded lists, and
lines wrapped at `line-length`. You don't configure much, which is the point.

```python
# Before ruff format
invoice = {'number':'INV-1042','lines':[ ('Coffee beans',2,12.5),('Mug',1,8.0) ],'paid':False}

# After ruff format
invoice = {"number": "INV-1042", "lines": [("Coffee beans", 2, 12.5), ("Mug", 1, 8.0)], "paid": False}

invoice["number"]
```

```bash
uv run ruff format            # rewrite files
uv run ruff format --check    # in CI: fail if anything would change, touch nothing
```

> [!JS]
> Coming from JavaScript: ruff is ESLint and Prettier in one binary, configured in
> `pyproject.toml` rather than `.eslintrc` and `.prettierrc`, and fast enough to run on every save.

## Configuring mypy for a project

Type hints don't do anything at runtime. This call is wrong, and Python runs it anyway:

```python
def total_cents(prices: list[int]) -> int:
    return sum(prices)

total_cents([1.5, 2.25])
```

mypy is what catches it, so in a project it gets configured once, in `pyproject.toml`, and run the
same way by everyone:

```toml
[tool.mypy]
strict = true
files = ["src", "tests"]

[[tool.mypy.overrides]]
module = ["invoicer.legacy", "invoicer.legacy.*"]
disallow_untyped_defs = false        # old code, typed a module at a time

[[tool.mypy.overrides]]
module = ["reportlab.*"]
ignore_missing_imports = true        # a dependency with no type hints
```

```bash
uv add --dev mypy
uv run mypy
```

```text
src/invoicer/totals.py:12: error: Argument 1 to "total_cents" has incompatible type "list[float]"; expected "list[int]"  [arg-type]
Found 1 error in 1 file (checked 6 source files)
```

`[[tool.mypy.overrides]]` is an array of tables, like `[[package]]` in `uv.lock`: each one relaxes
or tightens options for the modules it lists. A pattern ending in `.*` matches a package and
everything under it. When several match, the most specific one wins: an exact module name beats a
wildcard, and `invoicer.legacy.*` beats `invoicer.*`. Settings no override mentions come from
`[tool.mypy]`.

> [!TIP]
> Start new projects with `strict = true`. Relaxing a strict project for one legacy module is
> easy; tightening a lax one later means fixing hundreds of errors at once.

## pre-commit: run the checks before every commit

A check that people have to remember to run doesn't get run. **pre-commit** installs a git hook that
runs your checks on the files you're committing, and stops the commit if one fails. Its
configuration lives in `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.14.0
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-toml
```

```bash
uv tool install pre-commit     # once per machine
pre-commit install             # once per clone: adds .git/hooks/pre-commit
pre-commit autoupdate          # bump every rev: to its latest release
pre-commit run --all-files     # check the whole project now, not just staged files
```

```text
ruff check...............................................................Passed
ruff format..............................................................Failed
- hook id: ruff-format
- files were modified by this hook

1 file reformatted, 5 files left unchanged

trim trailing whitespace.................................................Passed
fix end of files.........................................................Passed
check toml...............................................................Passed
```

When a hook fixes files, the commit is stopped so you can look at the changes. `git add` them and
commit again. Keep hooks fast: ruff takes milliseconds, while mypy and pytest take longer and
usually run in CI (`uv run mypy` and `uv run pytest` in a GitHub Actions job) instead.

```quiz
question: You run `git commit` and the ruff-format hook says "files were modified by this hook". What now?
options:
  - Nothing, the commit went through with the formatted files
  - Review the changes, git add them, and commit again
  - Run git commit --no-verify so the hook doesn't run
answer: 1
explain: The hook changed files in your working tree but the commit was stopped. Stage the fixed files and commit again. --no-verify skips every check and defeats the point.
```

## Do it on your machine

1. In your `invoicer` project, `uv add --dev ruff mypy`.
2. Paste the `parse_quantity` function from the top of this lesson into `main.py`, along with an
   unused `import os`, and run `uv run ruff check`. Then `uv run ruff check --fix` and see which
   problem was fixed for you and which wasn't.
3. Add the `[tool.ruff]` tables above to `pyproject.toml`, run `uv run ruff check` again, and look up
   one of the new findings with `uv run ruff rule <CODE>`.
4. Mess up the spacing in `main.py`, then run `uv run ruff format --check` (it fails) and
   `uv run ruff format` (it fixes it).
5. Add `[tool.mypy]` with `strict = true`, and run `uv run mypy main.py`. Fix what it reports.
6. `git init` if the folder isn't a repository yet. Write `.pre-commit-config.yaml`, then run
   `pre-commit install`, `pre-commit autoupdate` and `pre-commit run --all-files`.
7. Add some trailing spaces to a file and try to commit it. Watch the hook fix it and stop the
   commit, then stage the fix and commit again.
8. **Check it:** run `uv run ruff check; uv run mypy main.py` and paste the output into the lab box
   below.

## Where this leaves you

ruff lints (rules selected by prefix, `# noqa` for exceptions) and formats; mypy is configured in
`[tool.mypy]`, with overrides for the modules that need different rules; pre-commit runs the fast
checks on every commit. The drills build the ideas underneath: `noqa` comments, lint rules written
with `ast`, fixing real findings, and how mypy picks the settings for a module.
