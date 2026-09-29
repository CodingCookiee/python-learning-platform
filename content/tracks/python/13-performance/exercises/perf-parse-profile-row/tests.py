from plp import test, hidden
from solution import parse_row


@test("Reads a row for one of your functions")
def _():
    assert parse_row("     2000    0.125    0.000    0.125    0.000 main.py:13(is_known)") == (
        2000,
        0.125,
        0.125,
        "main.py:13(is_known)",
    )


@test("Keeps a built-in's description whole")
def _():
    assert parse_row("     2000    0.007    0.000    0.007    0.000 {method 'split' of 'str' objects}") == (
        2000,
        0.007,
        0.007,
        "{method 'split' of 'str' objects}",
    )


@test("Uses the total count for a recursive function")
def _():
    assert parse_row("      7/3    0.000    0.000    0.001    0.000 {built-in method builtins.sum}") == (
        7,
        0.0,
        0.001,
        "{built-in method builtins.sum}",
    )


@hidden("Handles a path with spaces and a trailing newline")
def _():
    assert parse_row("   412/1    0.004    0.000    1.050    1.050 /home/ada/monthly reports/tree.py:12(render)\n") == (
        412,
        0.004,
        1.05,
        "/home/ada/monthly reports/tree.py:12(render)",
    )


@hidden("Handles a large count and long times")
def _():
    assert parse_row("  1048576   12.500    0.000   31.250    0.000 feed.py:7(<lambda>)") == (
        1048576,
        12.5,
        31.25,
        "feed.py:7(<lambda>)",
    )
