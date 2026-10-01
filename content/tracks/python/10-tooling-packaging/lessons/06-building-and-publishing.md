---
slug: building-and-publishing
title: Building and publishing a package
summary: The src layout, entry points, versions, wheels built with uv build, and publishing to TestPyPI and PyPI.
minutes: 40
exercises:
  - pkg-wheel-filename
  - pkg-predict-src-layout
  - pkg-wheel-entry-points
  - pkg-fix-version-bump
  - pkg-release-check
lab:
  title: Build the invoicer package
  kind: github
  instructions: >-
    Push the packaged project (src/invoicer, pyproject.toml with the renamed distribution and the
    invoicer script). The checks run python -m invoicer --help, build a wheel and an sdist, and look
    for the entry point inside the wheel.
  requirements: [build]
---

`uv run cli.py` works in your project folder. A teammate, a server or a stranger can't use that:
they need something to install, and a command that appears on their `PATH` afterwards, the way
`ruff` and `pre-commit` did when you installed them. That something is a **package**: a
`pyproject.toml` with enough metadata, built into a **wheel**, and optionally uploaded to PyPI. This
lesson takes the invoicer tool all the way there.

## A package layout: src/

`uv init` made an application: loose files next to `pyproject.toml`. For something installable,
ask for a package instead:

```bash
uv init --package invoicer
```

```text
invoicer/
├── .python-version
├── README.md
├── pyproject.toml
└── src/
    └── invoicer/
        └── __init__.py
```

The code lives in `src/invoicer/`, one folder deeper than you might expect. That's deliberate.
Python puts the current folder on `sys.path`, so with a flat layout, `import invoicer` in a test
imports the folder next to it, whether or not the package installs correctly. With `src/`, the only
way to import `invoicer` is to install it, which uv does for you (in editable mode, so your changes
show up without reinstalling). Tests then run against the package exactly as users will get it.

```quiz
question: In a src layout, you run `python -c "import invoicer"` from the project root with the system Python, where the project isn't installed. What happens?
options:
  - It imports src/invoicer, because the project root is on sys.path
  - ModuleNotFoundError, because the root is on sys.path but the package is one level down in src/
  - It imports the version on PyPI
answer: 1
explain: sys.path has the project root, and there's no invoicer folder directly in it. That's the point of src/. Use `uv run`, which installs the project into .venv first.
```

As the tool grows, it gets a module for the command line and a `__main__.py`, which is what
`python -m invoicer` runs:

```text
src/invoicer/
├── __init__.py        __version__ and the public API
├── __main__.py        from invoicer.cli import main; raise SystemExit(main())
├── billing.py
└── cli.py             build_parser() and main(argv=None), from the last lesson
```

## Entry points: a command on PATH

`uv init --package` also added two tables to `pyproject.toml`:

```toml
[project.scripts]
invoicer = "invoicer.cli:main"

[build-system]
requires = ["uv_build>=0.9.2,<0.10.0"]
build-backend = "uv_build"
```

`[project.scripts]` maps a command name to a function, as `"module:function"`. When the package is
installed, the installer writes a tiny `invoicer` executable into the environment's `bin/` (or
`Scripts\`) folder that imports that module, calls the function with no arguments, and exits with
its return value. That's why `main(argv=None)` reads `sys.argv` when it's given nothing, and returns
an exit code. Resolving the string is ordinary Python:

```python
import importlib

entry = "textwrap:dedent"      # the same "module:function" shape as an entry point
module_name, _, function_name = entry.partition(":")
function = getattr(importlib.import_module(module_name), function_name)
function("    Invoice INV-1042\n    Total: 25.50")
```

`[build-system]` names the **build backend**, the tool that turns your source into a wheel.
`uv_build` is uv's own; `hatchling` and `setuptools` are common alternatives, and any of them works
with `uv build`. The version numbers in `requires` will match your uv.

> [!JS]
> Coming from JavaScript: `[project.scripts]` is the `"bin"` field of `package.json`. The difference
> is that npm links your file directly, while Python's installer generates a small launcher script
> that calls your function.

## Metadata other people will read

Before anyone else installs it, fill in the `[project]` table properly. PyPI shows all of this on
the package's page:

```toml
[project]
name = "invoicer-ada"
version = "0.1.0"
description = "Summarise invoice exports and chase unpaid invoices."
readme = "README.md"
requires-python = ">=3.12"
license = "MIT"
authors = [{ name = "Ada Lovelace", email = "ada@example.com" }]
keywords = ["invoices", "cli"]
classifiers = [
    "Programming Language :: Python :: 3",
    "Environment :: Console",
]
dependencies = ["httpx>=0.28"]

[project.urls]
Homepage = "https://github.com/ada/invoicer"
Issues = "https://github.com/ada/invoicer/issues"

[project.scripts]
invoicer = "invoicer.cli:main"

[tool.uv.build-backend]
module-name = "invoicer"
```

- `name` is the **distribution name**, what people type after `uv add`. It must be unique on PyPI,
  which is why this one ends in `-ada`. The **import name** can differ: here it's still `invoicer`,
  and `module-name` tells `uv_build` where to find it (by default it expects `invoicer_ada`).
- `requires-python` is a promise: installers refuse to install the package on older Pythons. Make
  it the oldest version you actually test on.
- `description` still saying "Add your description here" is the classic sign of a rushed release.

```quiz
question: With the pyproject.toml above published, a user runs `uv add invoicer-ada`. What do they write in their code?
options:
  - import invoicer_ada
  - import invoicer
  - import invoicer-ada
answer: 1
explain: The distribution name is what you install; the import name is the package folder inside, which module-name says is invoicer. (import invoicer-ada isn't even valid Python.)
```

Versions follow **semantic versioning**: `MAJOR.MINOR.PATCH`. Bump PATCH for fixes, MINOR for new
features, MAJOR when you break something people rely on. uv edits the number for you:

```bash
uv version                   # invoicer-ada 0.1.0
uv version --bump minor      # invoicer-ada 0.1.0 => 0.2.0
```

## uv build: sdists and wheels

```bash
uv build
```

```text
Building source distribution (uv build backend)...
Building wheel from source distribution (uv build backend)...
Successfully built dist/invoicer_ada-0.1.0.tar.gz
Successfully built dist/invoicer_ada-0.1.0-py3-none-any.whl
```

Two files appear in `dist/`. The **sdist** (`.tar.gz`) is your source plus `pyproject.toml`, to be
built on the user's machine. The **wheel** (`.whl`) is ready to install: installing it is just
unzipping it into `site-packages`. Its name says where it can be installed:

```python
"invoicer_ada-0.1.0-py3-none-any.whl".removesuffix(".whl").split("-")
```

That's the name (with `-` turned into `_`), the version, the **Python tag** (`py3`: any Python 3),
the **ABI tag** (`none`: no compiled code) and the **platform tag** (`any`). A package with compiled
code has one wheel per platform instead, like `numpy-2.3.3-cp314-cp314-win_amd64.whl`.

A wheel is a zip file. Inside, next to your package, is a `.dist-info` folder with the metadata:

```text
invoicer/__init__.py
invoicer/__main__.py
invoicer/billing.py
invoicer/cli.py
invoicer_ada-0.1.0.dist-info/METADATA           name, version, dependencies, README
invoicer_ada-0.1.0.dist-info/WHEEL              which tags it's built for
invoicer_ada-0.1.0.dist-info/entry_points.txt   [console_scripts] invoicer = invoicer.cli:main
invoicer_ada-0.1.0.dist-info/RECORD             every file, with a hash
```

Install the wheel exactly as a user would, before you publish anything:

```bash
uv tool install dist/invoicer_ada-0.1.0-py3-none-any.whl
invoicer --help
uv tool uninstall invoicer-ada
```

`uv tool install .` installs straight from the project folder, and
`uv tool install git+https://github.com/ada/invoicer` installs from a repository, with no PyPI
involved. For a tool used by a small team, that last one may be all the publishing you need.

## Publishing: TestPyPI first

**TestPyPI** is a separate copy of PyPI for practice. Uploads there don't matter, so make your
mistakes there. Create an account on test.pypi.org, create an API token under your account
settings, and tell uv where TestPyPI is:

```toml
[[tool.uv.index]]
name = "testpypi"
url = "https://test.pypi.org/simple/"
publish-url = "https://test.pypi.org/legacy/"
explicit = true
```

`explicit = true` means uv only uses this index when you name it, so it never installs your
dependencies from TestPyPI by accident. Then upload what `uv build` made:

```bash
uv build
uv publish --index testpypi --token pypi-AgENdGVzdC5weXBp...
```

Check the page at `https://test.pypi.org/project/invoicer-ada/`: the README renders, the links
work, the description isn't the placeholder. When it all looks right, create an account and token
on pypi.org and run `uv publish` without `--index`.

```quiz
question: Why is the testpypi index marked `explicit = true`?
options:
  - So that uv publish uploads there by default
  - So uv only uses it when a command names it, and never resolves your normal dependencies from TestPyPI
  - TestPyPI rejects uploads from indexes that aren't explicit
answer: 1
explain: Anyone can upload anything to TestPyPI, including packages with the same names as real ones. An explicit index is only consulted when you ask for it by name, as uv publish --index testpypi does.
```

> [!WARNING]
> A version can only be uploaded once, ever. If `0.1.0` has a mistake, you can't replace it: bump
> to `0.1.1` and publish again. That's one more reason to rehearse on TestPyPI, and to check the
> version before you build.

Finally, mark the release in git, so the published version and the code that built it can always
be matched up:

```bash
git tag v0.1.0
git push origin v0.1.0
```

> [!TIP]
> Once this works by hand, move it to CI: a GitHub Actions workflow that runs on a pushed `v*` tag,
> runs `uv build`, and publishes with PyPI's **trusted publishing**, which needs no token at all.

## Do it on your machine

1. `uv init --package invoicer` in a fresh folder, then `uv run invoicer`. It prints
   "Hello from invoicer!" through the entry point.
2. Move your argparse `main(argv=None)` into `src/invoicer/cli.py`, point `[project.scripts]` at
   `invoicer.cli:main`, and add `__main__.py`. Check `uv run invoicer --help` and
   `uv run python -m invoicer --help` both work.
3. Fill in the metadata. Rename the distribution to `invoicer-<your GitHub username>` and set
   `module-name = "invoicer"` under `[tool.uv.build-backend]`.
4. `uv build`, then open the wheel with any zip tool (or `python -m zipfile -l dist/*.whl`) and find
   `entry_points.txt`.
5. `uv tool install dist/<your wheel>`, run `invoicer --help` from another folder, then
   `uv tool uninstall` it.
6. Publish to TestPyPI with the index config above, and look at your project page.
7. `uv version --bump patch`, build and publish again, and see both versions on TestPyPI. Tag the
   release in git.
8. **Check it:** push the project and connect the repository in the lab box below. The checks build
   the package on GitHub and inspect the wheel.

## Where this leaves you

A src layout forces tests to use the installed package. `[project.scripts]` turns `main` into a
command, `[build-system]` names the backend, and the metadata tells installers and PyPI what the
package is. `uv build` makes an sdist and a wheel, which is a zip with a `.dist-info` folder, and
`uv publish` uploads them, to TestPyPI first. The drills read wheel names and contents, predict
what the src layout does to imports, bump a version safely and check a release before it ships.
