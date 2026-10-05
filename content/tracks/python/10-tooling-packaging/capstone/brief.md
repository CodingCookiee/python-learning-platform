You freelance for three small clients: Millstone Coffee, Kiln Cafe and Harbour Books. Every Friday
you invoice them for the week's hours, and every Friday you dig through calendar entries and chat
messages trying to remember what you did on Tuesday. You want a tool that takes five seconds to use
from any terminal: `worklog add "Kiln Cafe" 1:15` when you finish a job, and `worklog report` when
you invoice.

This capstone is less about the code, which is small, and more about everything around it. You'll
ship **worklog** the way real Python tools are shipped: a uv project in the src layout, with
complete metadata, an entry point, logging configured by the application, ruff, mypy and pytest
all passing, pre-commit guarding every commit, a README, and a tagged release that anyone can
install with one `uv tool install` command. You'll do all of it on your own machine; the checklist
at the end of each lesson in this module is the practice run.

## A sample run

```text
$ worklog add "Millstone Coffee" 2.5 --date 2026-09-28 --note "Stock report fixes"
Logged 2.50 h for Millstone Coffee on 2026-09-28
$ worklog add "Kiln Cafe" 1:15 --date 2026-09-29
Logged 1.25 h for Kiln Cafe on 2026-09-29
$ worklog add "Millstone Coffee" 3 --date 2026-09-30
Logged 3.00 h for Millstone Coffee on 2026-09-30
$ worklog add "Harbour Books" 0.75 --date 2026-10-02 --note "Call about the invoice export"
Logged 0.75 h for Harbour Books on 2026-10-02

$ worklog list --week 2026-W40
2026-09-28  Millstone Coffee   2.50  Stock report fixes
2026-09-29  Kiln Cafe          1.25
2026-09-30  Millstone Coffee   3.00
2026-10-02  Harbour Books      0.75  Call about the invoice export

$ worklog report --week 2026-W40
Week 2026-W40 (28 Sep - 4 Oct 2026)

Client              Hours
-------------------------
Millstone Coffee     5.50
Kiln Cafe            1.25
Harbour Books        0.75
-------------------------
Total                7.50

$ worklog report --week 2026-W40 --format csv
client,hours
Millstone Coffee,5.50
Kiln Cafe,1.25
Harbour Books,0.75

$ worklog add "Kiln Cafe" 30
usage: worklog add [-h] [--date DATE] [--note NOTE] client hours
worklog add: error: argument hours: 30 isn't between 0 and 24 hours
$ echo $?
2

$ worklog -v add "Kiln Cafe" 0.5 --date 2026-10-01
worklog: INFO: Appended to /home/ada/.worklog.jsonl
Logged 0.50 h for Kiln Cafe on 2026-10-01

$ worklog --version
worklog 0.1.0
```

## Requirements

### The commands

The main command takes these options before the subcommand:

| Option | Meaning |
|--------|---------|
| `--file PATH` | The log file. Defaults to the `WORKLOG_FILE` environment variable, or `~/.worklog.jsonl` |
| `-v`, `--verbose` | More output on stderr: `-v` for `INFO`, `-vv` for `DEBUG` |
| `-q`, `--quiet` | Only errors on stderr |
| `--version` | Prints `worklog 0.1.0` (the installed version) and exits |

And three subcommands:

- **`worklog add CLIENT HOURS [--date DAY] [--note TEXT]`** appends one entry to the log file,
  creating it if needed, and prints `Logged 2.50 h for Millstone Coffee on 2026-09-28`.
  - `HOURS` is a decimal (`2.5`) or hours and minutes (`1:15`, which is 1.25). It must be more
    than 0 and at most 24, and is stored to two decimal places.
  - `--date` is `YYYY-MM-DD` and defaults to today. `--note` defaults to no note.
- **`worklog list [--week WEEK]`** prints the week's entries, oldest first: the date, two spaces,
  the client left-aligned in 18 characters, the hours right-aligned in 5 with two decimals, two
  spaces, and the note (with no trailing spaces when there isn't one).
- **`worklog report [--week WEEK] [--format {table,csv,json}]`** totals the week's hours per client,
  most hours first (then by name).
  - `table` (the default) prints the heading `Week 2026-W40 (28 Sep - 4 Oct 2026)`, a blank line,
    then the table exactly as in the sample: client left-aligned in 18, hours right-aligned in 7,
    a rule of 25 dashes above and below the rows, then the total. With no hours that week, the
    heading is followed by `No hours logged.`
  - `csv` prints a `client,hours` header and one row per client. `json` prints a list of
    `{"client": ..., "hours": "5.50"}` objects. Neither prints a heading, so the output can be
    redirected straight into a file.
- `WEEK` is an ISO week, `YYYY-Www` like `2026-W40`, running Monday to Sunday. It defaults to the
  current week.

### Errors and exit codes

- Anything wrong with the arguments is an argparse usage error: a message on stderr and exit status
  2. That includes hours outside 0 to 24 or not a number, a malformed date or week, and an unknown
  format. Type functions raise `argparse.ArgumentTypeError` with a message that says what was
  wrong, as in the sample.
- A line in the log file that can't be read (someone edited it by hand) is skipped with a warning
  naming the line number, and everything else still works.
- `main(argv=None)` returns `0` on success, and the entry point exits with it.

### The log file

One JSON object per line, appended by `add`:

```text
{"date": "2026-09-28", "client": "Millstone Coffee", "hours": "2.50", "note": "Stock report fixes"}
```

Hours are stored as strings and read back as `Decimal`, so 0.1 + 0.2 never becomes
0.30000000000000004 on an invoice.

### The package

```text
worklog/
├── .gitignore
├── .pre-commit-config.yaml
├── .python-version
├── README.md
├── pyproject.toml
├── uv.lock
├── src/
│   └── worklog/
│       ├── __init__.py        __version__, read from the installed metadata
│       ├── __main__.py        so python -m worklog works
│       ├── cli.py             argparse, logging setup, printing; nothing else
│       ├── report.py          pure functions: filter by week, total, format a table
│       └── store.py           an Entry dataclass, append() and load()
└── tests/
    ├── test_cli.py
    ├── test_report.py
    └── test_store.py
```

- `report.py` and `store.py` never print and never call `logging.basicConfig`. They log through
  `logging.getLogger(__name__)`, like any library.
- `cli.py` configures logging once, with `dictConfig`, at the start of `main()`, writing to stderr
  with a `worklog: LEVEL: message` format and `disable_existing_loggers` set to `False`.
- Everything is type-annotated and passes `mypy` with `strict = true`.

## The workflow, step by step

Work through these in order. Commit after each numbered step, with pre-commit running from step 3
onwards.

### 1. Create the project

```bash
uv init --package worklog
cd worklog
uv run worklog
```

That prints `Hello from worklog!` through the entry point `uv init --package` created. Read the
generated `pyproject.toml`, then make the first commit.

### 2. Add the development tools

```bash
uv add --dev pytest ruff mypy
```

Then configure them in `pyproject.toml`:

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "W", "F", "I", "B", "UP", "SIM"]

[tool.mypy]
strict = true
files = ["src", "tests"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

Check they all run: `uv run ruff check`, `uv run ruff format --check`, `uv run mypy` and
`uv run pytest` (pytest will say no tests ran, which is fine for now).

### 3. Install pre-commit

```bash
uv tool install pre-commit
```

Write `.pre-commit-config.yaml` with the ruff hooks (`ruff-check` with `--fix`, and `ruff-format`)
and `trailing-whitespace`, `end-of-file-fixer` and `check-toml` from `pre-commit-hooks`, as in
lesson 3. Then:

```bash
pre-commit install
pre-commit autoupdate
pre-commit run --all-files
```

### 4. Write the code, test first where you can

1. Copy this capstone's starter into `src/worklog/cli.py`, and set `__version__` in
   `src/worklog/__init__.py` (see "Things the lessons didn't cover"). The CLI won't run until the
   `...` bodies are written.
2. Write `store.py`: a frozen `Entry(day, client, hours, note="")` dataclass, `append(path, entry)`
   and `load(path)`. Test them with pytest's `tmp_path` fixture before touching the CLI.
3. Write `report.py`: `in_week(entries, start, end)`, `totals(entries)` and `table(rows)`, all pure
   functions, with tests that build `Entry` objects directly.
4. Fill in the type functions (`parse_hours`, `parse_day`, `parse_week`) and test them, including
   the refusals.
5. Finish the parser and the three command functions. Test `main([...])` end to end, passing
   `--file` with a path under `tmp_path`, and checking output with `capsys` and exit codes with
   `pytest.raises(SystemExit)`.
6. Run `uv run mypy` and `uv run ruff check` as you go, not just at the end.

### 5. Fill in the metadata

Complete the `[project]` table: a real `description` (not uv's placeholder), `readme`,
`requires-python`, `license = "MIT"` (or your choice), `authors`, `keywords` and `[project.urls]`
pointing at your repository. Point the entry point at the CLI:

```toml
[project.scripts]
worklog = "worklog.cli:main"
```

If you plan to publish to TestPyPI (a stretch goal), name the distribution `worklog-<your GitHub
username>` and add `module-name = "worklog"` under `[tool.uv.build-backend]`, so the import name
stays `worklog`.

### 6. Write the README

What worklog does in one paragraph; how to install it; one example per command; where the log
file lives and how to change it; and a "Development" section with the commands from step 2 and
`pre-commit install`.

### 7. Build and install it like a user would

```bash
uv build
uv tool install dist/worklog-0.1.0-py3-none-any.whl
cd ~
worklog --version
worklog add "Kiln Cafe" 1:15
worklog report
uv tool uninstall worklog
```

(Use your own wheel's name if you renamed the distribution.) Running it from your home folder, not
the project, proves it doesn't depend on the source tree.

### 8. Tag the release and push

```bash
git tag v0.1.0
git push origin main --tags
uv tool install git+https://github.com/<you>/worklog@v0.1.0
worklog --help
```

That last install is exactly what the reviewer will run.

## Things the lessons didn't cover

- **ISO weeks.** `date.fromisocalendar(2026, 40, 1)` is the Monday of week 40, and
  `some_date.isocalendar()` gives back `(year, week, weekday)`. Build the heading with
  `f"{start.day} {start:%b}"`, since `%d` would give `04`.
- **Minutes in hours.** `1:15` is `Decimal(1) + Decimal(15) / 60`. Round money-like values with
  `value.quantize(Decimal("0.01"))`.
- **The version at run time.** In `__init__.py`,
  `__version__ = importlib.metadata.version("worklog")` reads the installed version, so the number
  only lives in `pyproject.toml`. (Use your distribution name if you renamed it.) Then
  `add_argument("--version", action="version", version=f"%(prog)s {__version__}")` prints it and
  exits.
- **Defaults from the environment.** `os.environ.get("WORKLOG_FILE", DEFAULT_FILE)` as the default
  for `--file`. In tests, `monkeypatch.setenv("WORKLOG_FILE", str(tmp_path / "log.jsonl"))` sets it
  for one test, but passing `--file` explicitly is simpler and clearer.
- **CSV to stdout.** `csv.writer(sys.stdout, lineterminator="\n")` writes rows straight to the
  output; in tests, `capsys` captures them.
- **Typing argparse.** `args.handler` is `Any` to mypy, so `return int(args.handler(args))` keeps
  `main` returning an `int` under `strict`.

## Try these

Before you tag the release, check each of these by hand:

- `worklog report --week 2026-W40 --format csv > hours.csv` produces a file with exactly the CSV
  lines, and nothing else. Add `-v` and the file is still clean, because logging goes to stderr.
- `worklog add "Kiln Cafe" 0`, `worklog add "Kiln Cafe" lots`, `worklog add "Kiln Cafe" 2
  --date 2026-02-30` and `worklog report --week 2026-W60` are all usage errors with status 2.
- Add a line of rubbish to the log file by hand. `worklog report` warns about that line number and
  still reports everything else. `worklog -q report` hides the warning.
- `WORKLOG_FILE=/tmp/test.jsonl worklog add "Harbour Books" 1` writes to `/tmp/test.jsonl`
  (PowerShell: `$env:WORKLOG_FILE = "..."` first).
- `uv run python -m worklog --version` works as well as `uv run worklog --version`.
- On a fresh clone: `uv sync --locked`, then all four checks from step 2 pass.

## Stretch goals

- **Publish to TestPyPI.** Rename the distribution as in step 5, add the `testpypi` index from
  lesson 6, and `uv publish --index testpypi`. Put the TestPyPI link in your README.
- **CI.** A GitHub Actions workflow that runs `uv sync --locked`, the ruff checks, mypy and pytest
  on every push, using the `astral-sh/setup-uv` action.
- **Date ranges.** `worklog report --from 2026-09-01 --to 2026-09-30` for monthly invoices, in a
  mutually exclusive group with `--week` (`parser.add_mutually_exclusive_group()`).
- **Rates.** A `[clients]` table in a TOML config file (`~/.config/worklog.toml`, read with
  `tomllib`) giving each client an hourly rate, and a `--money` flag that adds an amount column.
- **Undo.** `worklog undo` removes the last entry, after printing it and asking for confirmation
  unless `--yes` is given.
- **JSON logs.** A `--log-format json` option that swaps in the JSON formatter from lesson 4.

## How it's tested

Automated tests run on every push to your repository, on the code you pushed (not the tagged
release). They rely on this:

- The project installs with `uv pip install -e .`, so `pyproject.toml` needs its `[build-system]`
  table and `worklog = "worklog.cli:main"` under `[project.scripts]`. The tests run your tool as
  `python -m worklog` and through the installed `worklog` command.
- Every run passes `--file` with a temporary log, except one that sets `WORKLOG_FILE` instead.
  Outputs are compared with the sample run character for character, including the rule lines, the
  `No hours logged.` week and the CSV. JSON output is compared as data.
- A usage error must exit with status 2, print `usage:` and the reason on stderr, and print nothing
  on stdout. A skipped log line must log a `worklog: WARNING: ...` line that includes the line
  number.
- The tests also call `main([...])` from `worklog.cli` and expect it to return `0`.
- From the top of the repository, they run `ruff check`, `ruff format --check` and `mypy` with the
  settings in your `pyproject.toml` (which must set `strict = true` and the `files` to check), and
  `pytest tests`. All four must pass.

## How to submit

Push the repository to GitHub and make sure the `v0.1.0` tag is pushed. Connect the repository on
this capstone's page and add the workflow file it gives you (`.github/workflows/pylearn.yml`): the
tests then run on every push, and the page shows the results. The review installs your tool with
`uv tool install git+<your repo>@v0.1.0`, runs the sample session and the "Try these" checks
against it, then runs `uv sync --locked`, `uv run ruff check`, `uv run ruff format --check`,
`uv run mypy` and `uv run pytest` on a fresh clone. Finally it reads the code and the history
against the criteria: a thin `cli.py`, library-style logging in the other modules, `Decimal` hours,
tests that call `main()` with a temporary file, and nothing generated in git.
