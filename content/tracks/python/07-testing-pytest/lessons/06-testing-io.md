---
slug: testing-io
title: Testing files and output
summary: Give every test its own folder with tmp_path, check what code prints with capsys, and test a command-line entry point end to end.
minutes: 35
exercises:
  - pytest-capsys-receipt
  - pytest-invoice-export-tmp-path
  - pytest-fix-leaky-file-tests
  - pytest-sales-cli
---

A lot of useful code reads or writes files: an invoice export, a CSV import, a nightly report. And
command-line tools print their results. Module 6 taught you to write that code; this lesson is about
testing it without leaving files all over the project and without reading the terminal by eye.

## tmp_path: a fresh folder for every test

The wrong way first. This test writes its file into whatever folder pytest happens to run in:

```python norun
from pathlib import Path

from export import export_invoices


def test_export_writes_a_header():
    export_invoices(INVOICES, Path("invoices.csv"))
    assert Path("invoices.csv").read_text().startswith("number,customer,total")
```

It leaves `invoices.csv` behind in your project after every run. Run the suite twice at once (in
two terminals, or in parallel on CI) and the runs overwrite each other's files. And a second test
that reads `invoices.csv` passes only if this one ran first.

The built-in `tmp_path` fixture gives each test a `pathlib.Path` to a **new, empty folder**, unique
to that test:

```python norun
def test_export_writes_a_header(tmp_path):
    target = tmp_path / "invoices.csv"
    export_invoices(INVOICES, target)
    assert target.read_text().startswith("number,customer,total")
```

pytest creates the folders under the system's temporary directory and removes old ones itself
(it keeps the most recent few runs, so you can look inside after a failure). Nothing lands in the
project, and no two tests ever share a file. Everything you know from module 6 works on it:
`/` to join paths, `read_text`, `write_text`, `open`, `mkdir`, `exists`.

> [!TIP]
> For a folder shared by a whole session, such as sample data built once for many tests, use the
> `tmp_path_factory` fixture in a session-scoped fixture: `tmp_path_factory.mktemp("prices")`.

## Testing both directions of a file

There are two kinds of file test, and a module usually needs both:

- **The code writes, the test reads.** Call the code with a path inside `tmp_path`, then read
  the file back with plain Python (or `csv`) and check what's in it. Don't check it with the
  module's own reader: if the writer and reader share a bug, the round trip still passes.
- **The test writes, the code reads.** Put a small, hand-written input file in `tmp_path`, then
  call the reader on it. You control every line, including the awkward ones: a blank line, a
  missing column, a byte-order mark.

```python norun
def test_import_skips_blank_lines(tmp_path):
    source = tmp_path / "orders.csv"
    source.write_text("sku,quantity\nMUG,2\n\nTEA,1\n", encoding="utf-8")

    assert import_orders(source) == [("MUG", 2), ("TEA", 1)]
```

```quiz
question: A test writes invoices with export_invoices() and then reads them back with load_invoices() from the same module, checking it gets the same invoices. Which bug can it miss?
options:
  - "export_invoices raising an error"
  - "Both functions using a semicolon instead of a comma as the separator"
  - "load_invoices returning an empty list"
answer: 1
explain: A matching mistake in the writer and the reader cancels out, so the round trip still works, but every other program that opens the file sees semicolons. Read the file back with csv or read_text as well.
```

## capsys: checking what was printed

pytest captures everything printed during a test (that's why a passing test's `print()` output
doesn't clutter the report). The built-in `capsys` fixture lets the test read it.
`capsys.readouterr()` returns what was written to standard output and standard error **since the
test started, or since the last call to `readouterr()`**, as `.out` and `.err`:

```python norun
def test_receipt_ends_with_the_total(capsys):
    print_receipt([("Mug", 2, Decimal("8.00"))])
    out = capsys.readouterr().out
    assert out.splitlines()[-1] == "Total: 16.00"
```

Each call to `readouterr()` empties the capture, so a test can call the code twice and check each
part separately. Check `.err` too: error messages belong on standard error, and a tool that prints
them to standard output breaks every script that pipes its output somewhere.

> [!JS]
> Coming from Jest: this replaces `jest.spyOn(console, "log")` and inspecting `mock.calls`. You get
> the printed text itself, exactly as the user would see it.

> [!NOTE]
> Code that uses `logging` instead of `print` is tested with the `caplog` fixture, whose `.text`
> and `.records` hold what was logged. And `capfd` captures at the level of the operating system's
> file descriptors, for output from C extensions and subprocesses (it isn't available in the browser).

## Testing a command-line tool

A command-line tool is easiest to test when its entry point is a function that **takes the
arguments as a list and returns the exit code**, instead of reading `sys.argv` and calling
`sys.exit()` itself:

```python norun
def main(argv):
    ...
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
```

Then a test can run the whole tool, with a real input file and real output, in a few lines. Run
this: it writes a small CLI and its tests to a folder and runs pytest on them.

```python
import os
import tempfile

import pytest

TESTS = r'''
import sys
from pathlib import Path

def main(argv):
    """Print the number of lines in a file."""
    if len(argv) != 1:
        print("usage: count_lines FILE", file=sys.stderr)
        return 2
    path = Path(argv[0])
    if not path.exists():
        print(f"error: no such file: {path.name}", file=sys.stderr)
        return 1
    print(len(path.read_text().splitlines()))
    return 0

def test_counts_the_lines(tmp_path, capsys):
    orders = tmp_path / "orders.csv"
    orders.write_text("sku,quantity\nMUG,2\nTEA,1\n")
    assert main([str(orders)]) == 0
    assert capsys.readouterr().out == "3\n"

def test_missing_file_is_an_error(tmp_path, capsys):
    assert main([str(tmp_path / "missing.csv")]) == 1
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == "error: no such file: missing.csv\n"
'''

os.chdir(tempfile.mkdtemp())
with open("test_count_lines.py", "w") as file:
    file.write(TESTS)

pytest.main(["-v", "--capture=sys", "-p", "no:cacheprovider", "-p", "no:faulthandler"])
```

The `r` in front of the string keeps each `\n` as written, so it reaches the test file as an escape
sequence rather than a line break. Both tests pass without leaving any files behind, and between them they check the output, the error message, the stream each one went to,
and the exit code.

```quiz
question: A test calls `main([...])` twice, calling `capsys.readouterr()` after each call. What does the second readouterr() return?
options:
  - "Everything printed by both calls"
  - "Only what was printed by the second call"
  - "An empty result, because capsys can only be read once"
answer: 1
explain: readouterr() returns what was captured since the last time it was called, then starts again from empty. That's what lets one test check two steps separately.
```

## Where this leaves you

`tmp_path` gives each test its own empty folder, so file tests never collide or leave anything
behind. Check files the code writes with plain file reading, and feed readers small hand-written
files. `capsys.readouterr()` returns what was printed to standard output and standard error since
the last call. Give command-line tools a `main(argv)` that returns an exit code, and they can be
tested end to end.
