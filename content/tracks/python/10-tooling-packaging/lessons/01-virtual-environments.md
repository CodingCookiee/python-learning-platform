---
slug: virtual-environments
title: Virtual environments
summary: Where imports come from, what site-packages is, and why every project gets its own interpreter folder.
minutes: 30
exercises:
  - tooling-environment-label
  - tooling-venv-paths
  - tooling-pyvenv-cfg
  - tooling-gitignore-predict
  - tooling-shadowed-module
lab:
  title: A venv of your own
  kind: output
  instructions: >-
    With httpx installed in the venv (step 4), run the command below with the venv's Python
    (on Windows, .venv\Scripts\python) and paste its output. It should print True and a path to
    httpx inside .venv's site-packages.
  command: .venv/bin/python -c "import sys, httpx; print(sys.prefix != sys.base_prefix, httpx.__file__)"
  patterns:
    - '^True '
    - '\.venv[\\/].*site-packages[\\/]httpx[\\/]__init__\.py'
---

You have two projects on one laptop. The invoicing app was written against Pydantic 1 and nobody has
had time to port it. The new API needs Pydantic 2. Install one and the other breaks, because by
default there's one Python and one folder of installed packages, shared by everything. A **virtual
environment** fixes that by giving each project its own folder of packages. It sounds like magic
until you see how small the trick is.

## Where imports come from

When you write `import json`, Python searches a list of folders, in order, and uses the first match.
That list is `sys.path`:

```python
import sys

sys.path
```

The folders are, roughly:

1. The folder of the script you ran (or the current folder in the REPL). Here it's pylearn's own.
2. The standard library (here it's zipped into `python314.zip`).
3. **`site-packages`**, where installed third-party packages go.

Every module remembers the file it came from, which is the quickest way to answer "which copy of
this am I actually using?":

```python
import json

json.__file__
```

Run `python -c "import httpx; print(httpx.__file__)"` on your machine and you'll see a path ending
in `site-packages/httpx/__init__.py`. Installing a package with pip or uv means little more than
unzipping it into that folder.

```quiz
question: A project has a file called `random.py` next to `main.py`, and `main.py` does `import random`. What does it get?
options:
  - The standard library's random module
  - The project's random.py
  - An ImportError, because the name is ambiguous
answer: 1
explain: The script's own folder is first on sys.path, so the project's random.py wins and the standard library's is never reached. Don't name your files after modules you use.
```

## sys.prefix and site-packages

`sys.prefix` is the root folder of the Python installation that's running. Its `site-packages` is
where that Python looks for installed packages. `sys.base_prefix` is the installation Python was
originally installed into. Normally they're the same:

```python
import sys

site_packages = [folder for folder in sys.path if folder.endswith("site-packages")]
sys.prefix, sys.base_prefix, site_packages
```

In this browser, Python is installed at `/`, and they match: no virtual environment. On a Mac with
Python from Homebrew, `sys.prefix` is something like `/opt/homebrew/opt/python@3.14/Frameworks/...`,
and a `pip install` there changes what every script on the machine sees. That's the shared folder
that broke the invoicing app.

## A venv is a folder and a config file

A virtual environment is a folder, conventionally `.venv` in the project root, containing:

```text
.venv/
├── pyvenv.cfg                   says which Python this venv was made from
├── bin/                         Scripts\ on Windows
│   ├── python                   a link to (or copy of) the real interpreter
│   └── activate                 a shell script that puts bin/ first on PATH
└── lib/
    └── python3.14/              just Lib\ on Windows
        └── site-packages/       this project's packages, and nothing else
```

When Python starts, it looks for a `pyvenv.cfg` next to (or one folder above) its own executable.
If it finds one, it sets `sys.prefix` to the venv folder, which means `site-packages` is the venv's,
while `sys.base_prefix` still points at the real installation, where the standard library lives.
That is the whole mechanism. So this is how a program asks "am I in a venv?":

```python
import sys

in_venv = sys.prefix != sys.base_prefix
in_venv
```

`pyvenv.cfg` is a few `key = value` lines:

```text
home = /usr/local/bin
include-system-site-packages = false
version = 3.14.0
```

`include-system-site-packages = false` is what makes the venv isolated: the global site-packages
isn't added to `sys.path` at all.

> [!JS]
> Coming from JavaScript: `.venv` plays the part of `node_modules`, with one difference. Node looks
> for `node_modules` in every folder up from the importing file; Python has one `site-packages` per
> interpreter, so a venv works by giving the project its own interpreter.

## Creating one by hand

Python ships a `venv` module. You won't create venvs by hand for long (uv does it for you in the
next lesson), but doing it once shows there's nothing hidden:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -c "import sys; print(sys.prefix)"
```

```text
/home/ada/code/invoicer/.venv
```

Activating a venv only changes your shell's `PATH` so that `python` means `.venv/bin/python`. It
isn't required: running `.venv/bin/python main.py` directly gives exactly the same result, and
that's what tools like uv and your editor do.

```quiz
question: You activate .venv in one terminal, then open a second terminal in the same folder and run `python main.py`. Which Python runs it?
options:
  - The venv's Python, because the venv is in this folder
  - Whichever python the second terminal's PATH finds, usually the system one
  - Neither; Python refuses to run while a venv is active elsewhere
answer: 1
explain: Activation only changes PATH in the shell where you ran it. Nothing about the folder changes, which is why tools that call .venv/bin/python directly are more reliable than remembering to activate.
```

> [!WARNING]
> Never copy, move or commit a venv. Its scripts contain absolute paths to where it was created,
> and its packages were built for your OS. A venv is disposable: delete the folder and recreate it
> from the project's dependency list whenever you like.

## What to commit

Because a venv can be rebuilt, it stays out of git, along with Python's other generated files:
`__pycache__` folders of compiled bytecode, and the `build/` and `dist/` output of packaging. This is
the `.gitignore` that `uv init` writes for you:

```text
# Python-generated files
__pycache__/
*.py[oc]
build/
dist/
wheels/
*.egg-info

# Virtual environments
.venv
```

What *is* committed is everything needed to rebuild the environment exactly: `pyproject.toml`
(what the project needs), `uv.lock` (the exact versions it got) and `.python-version` (which
interpreter). Lesson 2 covers all three.

```python
from fnmatch import fnmatch

# gitignore patterns are glob patterns, matched against each part of a path
parts = "src/invoicer/__pycache__/cli.cpython-314.pyc".split("/")
[part for part in parts if fnmatch(part, "*.py[oc]") or fnmatch(part, "__pycache__")]
```

## Do it on your machine

1. Make an empty folder, `cd` into it, and run `python -m venv .venv`. Look inside: find
   `pyvenv.cfg` and `site-packages`.
2. Run `.venv/bin/python -c "import sys; print(sys.prefix, sys.base_prefix)"` (on Windows,
   `.venv\Scripts\python`). The two paths differ.
3. Run your system `python` with the same command. The two paths match.
4. Install something into the venv: `.venv/bin/python -m pip install httpx`. Check that
   `.venv/bin/python -c "import httpx"` works and that your system `python -c "import httpx"`
   (probably) doesn't.
5. **Check it:** run `.venv/bin/python -c "import sys, httpx; print(sys.prefix != sys.base_prefix, httpx.__file__)"`
   and paste the output into the lab box below.
6. Delete `.venv`. Nothing else on your machine changed. That's the point.

## Where this leaves you

Imports search `sys.path` and the first match wins. Installed packages live in `site-packages`, and a
virtual environment is a folder with its own `site-packages` and a `pyvenv.cfg` that makes Python
use it. It's disposable, so it never goes in git. The drills have you reason about exactly those
paths and files.
