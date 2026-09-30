---
slug: uv-projects
title: Projects with uv
summary: uv init, uv add, version ranges, the lockfile, uv run, tools and Python versions, and what each one writes to disk.
minutes: 40
exercises:
  - tooling-pyproject-summary
  - tooling-dependency-names
  - tooling-specifier-check
  - tooling-lock-diff
  - tooling-best-match
lab:
  title: The invoicer project
  kind: output
  instructions: >-
    In the invoicer folder, after adding httpx and the dev tools, run the command below and paste
    its output. It should show invoicer with httpx as a dependency and pytest and ruff in the dev
    group.
  command: uv tree
  patterns:
    - '^invoicer v\d+\.\d+\.\d+'
    - 'httpx v\d+\.\d+'
    - 'pytest v[\d.]+ \(group: dev\)'
    - 'ruff v[\d.]+ \(group: dev\)'
---

The last lesson built a venv by hand. Now multiply that by every project, add "which version of
httpx did this work with last March?", and the manual way stops scaling. **uv** is one tool that
creates the venv, installs Python itself if needed, resolves and locks dependencies, and runs your
code. It replaces `pip`, `venv`, `pip-tools`, `pipx` and `pyenv`, and it's fast enough that you stop
noticing it. You've typed `uv run` in earlier modules; this lesson explains what it actually does.

Install it once, following [the uv docs](https://docs.astral.sh/uv/getting-started/installation/):

```bash
# macOS and Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## uv init: a project is a folder with a pyproject.toml

```bash
uv init invoicer
cd invoicer
```

```text
Initialized project `invoicer` at `/home/ada/code/invoicer`
```

```text
invoicer/
├── .git/
├── .gitignore          the one from the last lesson
├── .python-version     which Python to use, e.g. 3.14
├── README.md
├── main.py             prints "Hello from invoicer!"
└── pyproject.toml
```

`pyproject.toml` is the project's description, in TOML. This is what `uv init` writes:

```toml
[project]
name = "invoicer"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.14"
dependencies = []
```

TOML is a config format with tables in `[brackets]`, and Python reads it with the standard
library's `tomllib`. Every tool that needs to know about your project reads it the same way:

```python
import tomllib

text = """
[project]
name = "invoicer"
version = "0.1.0"
requires-python = ">=3.14"
dependencies = ["httpx>=0.28.1", "rich>=14.0"]
"""
project = tomllib.loads(text)["project"]
project["name"], project["dependencies"]
```

> [!JS]
> Coming from JavaScript: `pyproject.toml` is `package.json`, `uv` is npm or pnpm, and `.venv` is
> `node_modules`. There's no `"scripts"` section: you run commands directly with `uv run`.

## uv run: the right environment, every time

```bash
uv run main.py
```

```text
Using CPython 3.14.0
Creating virtual environment at: .venv
Hello from invoicer!
```

Before it runs anything, `uv run` makes sure `.venv` exists, that `uv.lock` matches
`pyproject.toml`, and that the venv matches `uv.lock`. Then it runs your command with the venv's
Python. You never activate anything, and the environment can't drift, because every run checks it.
The same goes for tools installed in the project: `uv run pytest`, `uv run python` for a REPL,
`uv run -m invoicer` to run a package.

```quiz
question: A teammate pulls your branch, which added a dependency, and runs `uv run pytest`. What happens?
options:
  - pytest fails with ModuleNotFoundError until they run an install command
  - uv installs the new dependency into their .venv, then runs pytest
  - uv asks them to activate the venv first
answer: 1
explain: uv run syncs the environment with the lockfile before every command, so the new dependency is installed automatically.
```

## uv add: dependencies and version ranges

```bash
uv add httpx
```

```text
Resolved 8 packages in 214ms
Prepared 7 packages in 96ms
Installed 7 packages in 9ms
 + anyio==4.11.0
 + certifi==2025.10.5
 + h11==0.16.0
 + httpcore==1.0.9
 + httpx==0.28.1
 + idna==3.11
 + sniffio==1.3.1
```

(Your versions will be newer.) One package brought six more: httpx's own dependencies, and theirs.
`uv add` installed all of them and changed two files. In `pyproject.toml`, it added a **range**:

```toml
dependencies = [
    "httpx>=0.28.1",
]
```

Tools you need while developing, but your users don't, go in a separate group:

```bash
uv add --dev pytest ruff mypy
```

```toml
[dependency-groups]
dev = [
    "mypy>=1.18.2",
    "pytest>=8.4.2",
    "ruff>=0.14.0",
]
```

`uv remove httpx` takes one out again. To choose the range yourself, quote it:
`uv add "pydantic>=2.7,<3"`.

```quiz
question: Someone installs your finished package from PyPI. Which of these do they get?
options:
  - httpx only; the dev group is for people working on the project
  - httpx, pytest, ruff and mypy
  - Nothing until they run uv sync
answer: 0
explain: "[project] dependencies are what your package needs to run, so they're installed with it. [dependency-groups] are local to the project: they're installed by uv sync and uv run in your checkout, never for your users."
```

## Reading a version specifier

A dependency string is a name, optional extras in brackets, a specifier, and an optional marker
after `;`:

| You write | It means |
|-----------|----------|
| `httpx>=0.28.1` | 0.28.1 or anything newer |
| `pydantic>=2.7,<3` | any 2.x from 2.7 on; commas mean "and" |
| `rich==14.1.0` | exactly that version (a pin) |
| `click!=8.2.0` | anything except one known-broken release |
| `django==5.2.*` | any 5.2.x |
| `requests~=2.32` | a **compatible release**: `>=2.32, ==2.*` |
| `pydantic[email]>=2.7` | pydantic plus its optional `email` extra |
| `tzdata; sys_platform == "win32"` | only installed on Windows |

Versions compare part by part, as numbers. As strings they compare character by character, which
is wrong as soon as a part reaches two digits:

```python
"1.10.0" > "1.9.0", (1, 10, 0) > (1, 9, 0)
```

```quiz
question: Which versions does `~=2.2.1` allow?
options:
  - 2.2.1 and any later 2.x, like 2.9.0
  - 2.2.1 and any later 2.2.x, like 2.2.7, but not 2.3.0
  - Only 2.2.1
answer: 1
explain: "~= drops the last part you wrote and allows anything with the same prefix: ~=2.2.1 means >=2.2.1, ==2.2.*. Write ~=2.2 to allow any 2.x from 2.2 on."
```

> [!JS]
> Coming from JavaScript: npm's `^2.7.0` is Python's `>=2.7.0,<3`, and npm's `~2.7.0` is Python's
> `~=2.7.0`. Python's `~=` counts the parts you write, so `~=2.7` is the one that behaves like `^`.

## The lockfile: why ranges aren't enough

A range says what you're willing to accept. It can't say what you actually tested with: install
`httpx>=0.28.1` today and next month and you may get different httpx, and different versions of
all six packages under it. So `uv add` also wrote **`uv.lock`**, which records the exact version,
source and file hashes of every package in the tree, for every platform. Trimmed down to two
packages, and without the download URLs and hashes, it looks like this:

```toml
version = 1
requires-python = ">=3.14"

[[package]]
name = "httpx"
version = "0.28.1"
source = { registry = "https://pypi.org/simple" }
dependencies = [
    { name = "anyio" },
    { name = "certifi" },
    { name = "httpcore" },
    { name = "idna" },
]

[[package]]
name = "invoicer"
version = "0.1.0"
source = { virtual = "." }
dependencies = [
    { name = "httpx" },
]
```

It's TOML too, so it's easy to inspect. `[[package]]` is an **array of tables**: each one adds a
dict to the `package` list.

```python
import tomllib

lock = tomllib.loads("""
[[package]]
name = "httpx"
version = "0.28.1"

[[package]]
name = "idna"
version = "3.11"
""")
{package["name"]: package["version"] for package in lock["package"]}
```

You commit `uv.lock` and never edit it by hand. The commands around it:

```bash
uv lock                          # re-resolve after editing pyproject.toml by hand
uv sync                          # make .venv match uv.lock exactly (uv run does this for you)
uv lock --upgrade-package httpx  # move one package to the newest version its range allows
uv lock --upgrade                # move everything
uv sync --locked                 # in CI: fail if uv.lock is out of date instead of updating it
uv tree                          # show the dependency tree
```

> [!TIP]
> An application's lockfile is what gets deployed. A library's lockfile only pins its own test
> environment: people who install your library get whatever versions their own project resolves.
> That's why libraries use wide ranges (`>=2.7`) and never exact pins in `dependencies`.

> [!JS]
> Coming from JavaScript: `uv.lock` is `package-lock.json` or `pnpm-lock.yaml`, and
> `uv sync --locked` is the `npm ci` of uv.

## Tools that aren't part of a project

Some command-line tools you want everywhere, not in one project: pre-commit, or a CLI you wrote
yourself. `uv tool install` gives each one its own hidden venv and puts its command on your `PATH`:

```bash
uv tool install pre-commit     # installed once, available in every folder
uv tool list
uv tool upgrade --all

uvx ruff check                 # run a tool once, without installing it (short for `uv tool run`)
uvx pycowsay "Invoices sent"
```

Tools that your project's checks depend on, like pytest, ruff and mypy, still belong in the dev
group, so the lockfile pins them and everyone on the team runs the same versions.

```quiz
question: CI runs `ruff check` on every pull request, and a teammate's ruff reports errors that yours doesn't. What's the fix?
options:
  - Everyone runs uv tool install ruff again to get the latest
  - Add ruff to the dev group and run it with uv run ruff check, so uv.lock pins one version for everyone
  - Switch CI to uvx ruff check
answer: 1
explain: A new ruff release can add or change rules. Pinning it in uv.lock through the dev group means the same version runs on every machine and in CI. uvx and uv tool install take whatever is newest.
```

> [!JS]
> Coming from JavaScript: `uvx` is `npx`, and `uv tool install` is `npm install -g`, except that
> every tool gets its own isolated environment, so two tools can never break each other.

## Python versions

uv also installs Python itself, and downloads it automatically when a project asks for one you
don't have:

```bash
uv python list                  # installed and available versions
uv python install 3.13
uv python pin 3.13              # writes 3.13 to .python-version
uv run --python 3.12 pytest     # try your tests on another version, once
```

Two files, two jobs: `requires-python` in `pyproject.toml` is the range of versions your project
**supports** (it's published with your package); `.python-version` is the one version the project
**uses** for development. A program can check the running version the same way:

```python
import sys

sys.version_info[:2], sys.version_info >= (3, 14)
```

## Do it on your machine

1. Install uv and check it with `uv --version`.
2. `uv init invoicer`, then `cd invoicer` and `uv run main.py`. Note the `.venv` it created.
3. `uv add httpx`. Read the new `dependencies` line in `pyproject.toml`, open `uv.lock` and find
   httpx's exact version. Run `uv tree`.
4. `uv add --dev pytest ruff` and find the `[dependency-groups]` table.
5. Delete `.venv` completely, then run `uv run python -c "import httpx; print(httpx.__version__)"`.
   uv rebuilds the environment from the lockfile, with exactly the same versions.
6. `uv python install 3.13`, then `uv run --python 3.13 python --version`.
7. `uv tool install pre-commit` and check `pre-commit --version` works from any folder. You'll use
   it in lesson 3.
8. Commit `pyproject.toml`, `uv.lock` and `.python-version`, and check that `git status` doesn't
   list `.venv`.
9. **Check it:** run `uv tree` in `invoicer` and paste the output into the lab box below.

## Where this leaves you

`uv init` writes `pyproject.toml`; `uv add` puts a range there and exact versions in `uv.lock`;
`uv run` syncs the venv and runs your command in it. Ranges say what you accept, the lockfile says
what you got. The drills read these files the way uv does: pyproject tables, dependency strings,
specifiers and lockfile changes.
