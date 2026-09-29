import contextlib
import io
import sys

from plp import test, hidden, load_module, run_program
from solution import main


def run_main(argv):
    """Call main(argv) and return (return value, stdout, stderr)."""
    out, err = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = main(argv)
    except SystemExit as exit:
        said = (err.getvalue().strip().splitlines() or [""])[-1]
        raise AssertionError(f"main({argv}) exited with status {exit.code} instead of returning. argparse said: {said}") from None
    return code, out.getvalue(), err.getvalue()


def run_script(*args):
    """Run the file as `python slug.py ARGS...` and return its exit status (0 if it just ends)."""
    return run_program(argv=list(args)).exit_code


@test("Converts the titles it's given and returns 0")
def _():
    assert run_main(["Quarterly report: Q3", "Ship it!"]) == (0, "quarterly-report-q3\nship-it\n", "")


@test("Reports a bad title on stderr, carries on, and returns 1")
def _():
    assert run_main(["Ship it!", "???", "Done"]) == (
        1,
        "ship-it\ndone\n",
        "slug: error: '???' has no letters or digits\n",
    )


@test("Passes options through")
def _():
    assert run_main(["Hello World", "--separator", "_"]) == (0, "hello_world\n", "")


@test("Running it as a script exits with main()'s return code")
def _():
    assert run_script("Hello World") == 0, "python slug.py \"Hello World\" should call main() and exit with status 0"
    assert run_script("Fine", "!!!") == 1, "python slug.py Fine !!! should exit with status 1"


@hidden("Importing it runs nothing")
def _():
    assert load_module("slug").printed == ""


@hidden("With no titles it's argparse's usage error")
def _():
    try:
        with contextlib.redirect_stderr(io.StringIO()):
            main([])
    except SystemExit as exit:
        assert exit.code == 2
        return
    raise AssertionError("main([]) should exit with argparse's usage error")
