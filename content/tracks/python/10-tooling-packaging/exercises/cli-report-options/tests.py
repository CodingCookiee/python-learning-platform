import argparse
import contextlib
import io
from decimal import Decimal

from plp import test, hidden, raises
from solution import build_parser, parse_month


def parse(argv):
    """Parse argv, turning an argparse exit into a readable failure."""
    errors = io.StringIO()
    try:
        with contextlib.redirect_stderr(errors):
            return build_parser().parse_args(argv)
    except SystemExit:
        last = (errors.getvalue().strip().splitlines() or ["(no message)"])[-1]
        raise AssertionError(f"parse_args({argv}) exited with: {last}") from None


def usage_error(argv):
    """The exit code and the last line argparse printed, for arguments that should be refused."""
    errors = io.StringIO()
    with raises(SystemExit) as caught, contextlib.redirect_stderr(errors):
        build_parser().parse_args(argv)
    return caught.value.code, errors.getvalue().strip().splitlines()[-1]


@test("Parses the example")
def _():
    args = parse(["2026-09", "--format", "csv", "--min-total", "250.00"])
    assert (args.month, args.format, args.limit, args.min_total) == ((2026, 9), "csv", 10, Decimal("250.00"))


@test("Has the right defaults and types")
def _():
    assert vars(parse(["2025-12"])) == {"month": (2025, 12), "format": "table", "limit": 10, "min_total": Decimal("0")}
    assert type(parse(["2025-12", "--limit", "3"]).limit) is int


@test("parse_month refuses anything that isn't YYYY-MM")
def _():
    assert parse_month("2026-01") == (2026, 1)
    raises(argparse.ArgumentTypeError, parse_month, "2026-13", match="2026-13 isn't a month; use YYYY-MM")
    raises(argparse.ArgumentTypeError, parse_month, "September", match="September isn't a month")


@test("A bad month is a usage error with your message")
def _():
    assert usage_error(["2026-13"]) == (2, "report: error: argument month: 2026-13 isn't a month; use YYYY-MM")


@test("--format only accepts table, csv or json")
def _():
    assert usage_error(["2026-09", "--format", "pdf"]) == (
        2,
        "report: error: argument --format: invalid choice: 'pdf' (choose from table, csv, json)",
    )


@hidden("The help shows the month format and every default")
def _():
    text = " ".join(build_parser().format_help().split())
    for expected in ("YYYY-MM", "(default: table)", "(default: 10)", "(default: 0)"):
        assert expected in text, f"The help should mention {expected}"


@hidden("--min-total and --limit refuse non-numbers")
def _():
    assert usage_error(["2026-09", "--min-total", "lots"])[0] == 2
    assert usage_error(["2026-09", "--limit", "ten"])[0] == 2
