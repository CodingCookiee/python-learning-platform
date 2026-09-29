---
slug: argparse-clis
title: Command-line tools with argparse
summary: Positionals, options, types, defaults, help and subcommands, and a main(argv) that tests can call.
minutes: 40
exercises:
  - cli-backup-parser
  - cli-predict-namespace
  - cli-report-options
  - cli-fix-entry-point
  - cli-task-subcommands
---

Most tools you build end up run from a terminal: `invoicer report invoices.csv --currency GBP`. The
words after the command arrive in `sys.argv` as a list of strings, and turning that list into
settings is fiddlier than it looks. Options can come in any order, `--help` should work, a typo
should get a useful message, and `"5"` has to become `5`. The standard library's `argparse` does all
of it. This lesson also shows how to structure a CLI so that tests can call it like a function.

## Why not read sys.argv yourself

`sys.argv[0]` is the program's name and the rest are the arguments, exactly as typed. Here's the
wrong way first, a hand-rolled parser that assumes an order:

```python
def parse(argv):
    """Expects: PATH [--currency CODE]"""
    path = argv[0]
    currency = argv[2] if len(argv) > 2 else "EUR"
    return path, currency

parse(["invoices.csv", "--currency", "GBP"]), parse(["--currency", "GBP", "invoices.csv"])
```

The second call is just as valid a command line, and it gets the path `"--currency"`. Handling
every order, every missing value and `--help` by hand is a lot of code nobody wants to maintain.

## A parser in four lines

```python
import argparse

parser = argparse.ArgumentParser(prog="invoicer", description="Summarise an invoice export.")
parser.add_argument("path", help="CSV export to read")
parser.add_argument("--currency", default="EUR", help="currency to report in")

args = parser.parse_args(["--currency", "GBP", "invoices.csv"])
args.path, args.currency
```

`parse_args` takes a list of strings (with no program name) and returns a `Namespace`, a plain
object with one attribute per argument. An argument without dashes is **positional** and required;
one with dashes is an **option** and optional. Called with no list, `parse_args()` reads
`sys.argv[1:]`, which is what the real program does. Passing a list is what tests do.

> [!JS]
> Coming from JavaScript: argparse is `commander` or `yargs`, built into the standard library.
> `parse_args()` returns an object rather than a plain dict, so you write `args.currency`.

## Flags, counts and repeated options

`action` says what an option does when it appears:

```python
import argparse

parser = argparse.ArgumentParser(prog="invoicer")
parser.add_argument("paths", nargs="+", help="one or more exports")
parser.add_argument("--dry-run", action="store_true", help="show what would be sent")
parser.add_argument("-v", "--verbose", action="count", default=0, help="repeat for more detail")
parser.add_argument("--exclude", action="append", default=[], help="skip a customer (repeatable)")

vars(parser.parse_args(["sept.csv", "oct.csv", "-vv", "--exclude", "ACME", "--exclude", "Initech"]))
```

- `store_true` makes a flag: `False` unless it's given.
- `count` counts how many times it's given, so `-vv` is `2`. That's the `verbosity` from the
  logging lesson.
- `append` collects a list. `nargs="+"` takes one or more values for a single argument.
- `-v` and `--verbose` are two spellings of one option. The attribute is named after the long form,
  with dashes turned into underscores: `--dry-run` becomes `args.dry_run`.

## Types, choices and defaults

Every argument arrives as a string. `type=` converts it, and can be any function that takes a
string: `int`, `float`, `Decimal`, `pathlib.Path`, `date.fromisoformat`, or one of your own.
`choices=` limits the values allowed.

```python
import argparse
from decimal import Decimal

def month(text):
    year, _, number = text.partition("-")
    if not (year.isdigit() and number.isdigit() and 1 <= int(number) <= 12):
        raise argparse.ArgumentTypeError(f"{text} isn't a month; use YYYY-MM")
    return int(year), int(number)

parser = argparse.ArgumentParser(prog="invoicer")
parser.add_argument("month", type=month, help="month to report on, as YYYY-MM")
parser.add_argument("--currency", choices=["EUR", "GBP", "USD"], default="EUR")
parser.add_argument("--min-total", type=Decimal, default=Decimal("0"))

vars(parser.parse_args(["2026-09", "--min-total", "250.00"]))
```

A type function signals bad input by raising `argparse.ArgumentTypeError` (or `ValueError`), and
argparse turns that into an error message. A default that's a string also goes through `type`, so
`type=int, default="3"` gives you `3`.

> [!WARNING]
> argparse only turns `ArgumentTypeError`, `ValueError` and `TypeError` into a usage error.
> `Decimal("lots")` raises `decimal.InvalidOperation`, which isn't any of those, so
> `--min-total lots` crashes with a traceback. Wrap it in a type function that catches
> `InvalidOperation` and raises `ArgumentTypeError`.

## Errors and help end the program

When the arguments are wrong, argparse prints the usage line and an error to stderr, then raises
`SystemExit(2)`. That's what should happen: the shell sees exit status 2, which means "you called
it wrong".

```python raises
import argparse

parser = argparse.ArgumentParser(prog="invoicer")
parser.add_argument("path")
parser.add_argument("--currency", choices=["EUR", "GBP", "USD"], default="EUR")

parser.parse_args(["invoices.csv", "--currency", "YEN"])
```

`-h` or `--help` prints the help and raises `SystemExit(0)`. The help is generated from your
`help=` strings, which is why they're worth writing. `%(default)s` inside a help string shows the
default:

```python
import argparse

parser = argparse.ArgumentParser(prog="invoicer", description="Summarise an invoice export.")
parser.add_argument("path", help="CSV export to read")
parser.add_argument("--currency", default="EUR", choices=["EUR", "GBP", "USD"],
                    help="currency to report in (default: %(default)s)")
parser.add_argument("-v", "--verbose", action="count", default=0, help="say more; repeat for even more")

parser.print_help()
```

> [!TIP]
> In tests, `parser.format_help()` returns the same text as a string, and
> `with pytest.raises(SystemExit) as exit:` catches the exit so you can check `exit.value.code`.

## Subcommands

Tools like `git` and `uv` have subcommands, each with its own arguments. `add_subparsers` gives
each one a parser of its own, and `set_defaults(handler=...)` records which function should run:

```python
import argparse

def report(args):
    return f"report on {args.path} in {args.currency}"

def send(args):
    return f"send reminders, dry run: {args.dry_run}"

parser = argparse.ArgumentParser(prog="invoicer")
commands = parser.add_subparsers(dest="command", required=True)

report_parser = commands.add_parser("report", help="summarise an export")
report_parser.add_argument("path")
report_parser.add_argument("--currency", default="EUR")
report_parser.set_defaults(handler=report)

send_parser = commands.add_parser("send", help="email unpaid invoices")
send_parser.add_argument("--dry-run", action="store_true")
send_parser.set_defaults(handler=send)

args = parser.parse_args(["send", "--dry-run"])
args.command, args.handler(args)
```

`required=True` makes a missing subcommand an error rather than silently doing nothing. Each
subcommand gets its own `--help`: `invoicer report --help`.

## main(argv) and the __main__ guard

Put the parsing and the work in a `main` function that takes the argument list and **returns** an
exit code:

```python
import argparse
import sys

def build_parser():
    parser = argparse.ArgumentParser(prog="invoicer")
    parser.add_argument("path")
    parser.add_argument("--currency", default="EUR")
    return parser

def main(argv=None):
    args = build_parser().parse_args(argv)
    if not args.path.endswith(".csv"):
        print(f"invoicer: error: {args.path} isn't a CSV file", file=sys.stderr)
        return 1
    print(f"Reporting on {args.path} in {args.currency}")
    return 0

main(["invoices.csv", "--currency", "GBP"]), main(["invoices.xlsx"])
```

The last line calls it the way a test would. A real module ends with one guarded line instead:

```python norun
if __name__ == "__main__":
    raise SystemExit(main())
```

Each piece has a job:

- `argv=None` means `parse_args(None)`, which reads `sys.argv[1:]`. A test passes its own list.
- Returning `0` for success and `1` for failure lets the caller check the result, and
  `raise SystemExit(main())` hands it to the shell. Errors go to `sys.stderr`, so they don't end up
  in the output of `invoicer report > summary.txt`.
- The `__main__` guard means importing the module (as tests and the entry point in the next lesson
  do) runs nothing.

A pytest test then calls the CLI directly:

```python norun
import pytest

from invoicer.cli import main


def test_reports_in_gbp(capsys):
    assert main(["invoices.csv", "--currency", "GBP"]) == 0
    assert capsys.readouterr().out == "Reporting on invoices.csv in GBP\n"


def test_missing_path_is_a_usage_error(capsys):
    with pytest.raises(SystemExit) as exit:
        main([])
    assert exit.value.code == 2
    assert "required: path" in capsys.readouterr().err
```

## Do it on your machine

1. In your `invoicer` project, create `cli.py` with a `build_parser()` and a `main(argv=None)` like
   the one above, ending with the `__main__` guard.
2. Run `uv run cli.py --help`, then `uv run cli.py` with no arguments. Check the exit status with
   `echo $?` (PowerShell: `$LASTEXITCODE`): 0 after `--help`, 2 after the error.
3. Add a `-v/--verbose` count and pass `level_for(args.verbose)` from the logging lesson into your
   logging config at the start of `main()`.
4. Split it into `report` and `send` subcommands with `set_defaults(handler=...)`.
5. Write `tests/test_cli.py` with the two tests above and run `uv run pytest`.

## Where this leaves you

argparse turns `sys.argv` into a `Namespace`: positionals, options, flags, counts and lists, with
types, choices and defaults, generated help, and errors that exit with status 2. Subcommands get
their own parsers. `main(argv=None)` returns an exit code and sits behind a `__main__` guard, so the
same function serves the terminal and the tests. The drills build parsers, predict what they return,
fix a broken entry point and finish with a CLI with three subcommands.
