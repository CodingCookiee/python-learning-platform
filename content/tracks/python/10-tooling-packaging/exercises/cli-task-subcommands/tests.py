import contextlib
import io
from datetime import date

from plp import test, hidden
from solution import main


def run(argv, tasks):
    """Call main(argv, tasks) and return (return value, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = main(argv, tasks)
    except SystemExit as exit:
        said = (err.getvalue().strip().splitlines() or [""])[-1]
        raise AssertionError(f"main({argv}, ...) exited with status {exit.code}. argparse said: {said}") from None
    return code, out.getvalue(), err.getvalue()


def usage_error(argv, tasks):
    """The exit status for arguments argparse should refuse, or None if it accepted them."""
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            main(argv, tasks)
    except SystemExit as exit:
        return exit.code
    return None


def sample():
    return [
        {"id": 1, "title": "Send September invoices", "due": None, "done": True},
        {"id": 3, "title": "Chase INV-1042", "due": date(2026, 10, 1), "done": False},
        {"id": 2, "title": "Renew domain", "due": None, "done": False},
    ]


@test("Adds a task and lists everything")
def _():
    tasks = [{"id": 1, "title": "Send September invoices", "due": None, "done": True}]
    assert run(["add", "Chase INV-1042", "--due", "2026-10-01"], tasks) == (0, "Added task 2: Chase INV-1042\n", "")
    assert run(["list", "--all"], tasks) == (
        0,
        "  1 [x] Send September invoices\n  2 [ ] Chase INV-1042 (due 2026-10-01)\n",
        "",
    )


@test("add stores a complete task with the next id")
def _():
    tasks = sample()
    run(["add", "Book accountant"], tasks)
    assert tasks[-1] == {"id": 4, "title": "Book accountant", "due": None, "done": False}
    run(["add", "File VAT return", "--due", "2026-11-07"], tasks)
    assert tasks[-1] == {"id": 5, "title": "File VAT return", "due": date(2026, 11, 7), "done": False}


@test("list shows open tasks in id order")
def _():
    assert run(["list"], sample()) == (0, "  2 [ ] Renew domain\n  3 [ ] Chase INV-1042 (due 2026-10-01)\n", "")


@test("done marks a task, and refuses an unknown id")
def _():
    tasks = sample()
    assert run(["done", "3"], tasks) == (0, "Completed task 3: Chase INV-1042\n", "")
    assert tasks[1]["done"] is True
    assert run(["done", "9"], tasks) == (1, "", "tasks: error: no task with id 9\n")


@hidden("Says so when there's nothing to show, and numbers an empty list from 1")
def _():
    tasks = []
    assert run(["list"], tasks) == (0, "Nothing to do.\n", "")
    assert run(["add", "Water the plants"], tasks) == (0, "Added task 1: Water the plants\n", "")
    run(["done", "1"], tasks)
    assert run(["list"], tasks) == (0, "Nothing to do.\n", "")


@hidden("Bad arguments are usage errors")
def _():
    assert usage_error([], sample()) == 2, "A missing subcommand should be a usage error"
    assert usage_error(["add", "Pay rent", "--due", "next week"], sample()) == 2, "A bad --due should be a usage error"
    assert usage_error(["done", "three"], sample()) == 2, "An id that isn't a number should be a usage error"
