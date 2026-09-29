"""worklog's command line: src/worklog/cli.py

The skeleton of the CLI module. It parses arguments, configures logging and calls into
store.py (reading and writing the log file) and report.py (pure functions that total hours).
Keep this module thin: no arithmetic and no file formats in here.

Run it during development with:  uv run worklog --help
"""

import argparse
import logging
import logging.config
import os
import sys
from collections.abc import Sequence
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from worklog import __version__

logger = logging.getLogger(__name__)

DEFAULT_FILE = Path.home() / ".worklog.jsonl"


# Argument types: each takes the text from the command line and returns a value, or raises
# argparse.ArgumentTypeError with a message for the user.


def parse_hours(text: str) -> Decimal:
    """ "2.5" -> Decimal("2.50") and "1:15" -> Decimal("1.25"). More than 0 and at most 24."""
    ...


def parse_day(text: str) -> date:
    """ "2026-09-28" -> date(2026, 9, 28)."""
    ...


def parse_week(text: str) -> tuple[date, date]:
    """ "2026-W40" -> (Monday, Sunday) of that ISO week: (date(2026, 9, 28), date(2026, 10, 4))."""
    ...


# Logging: the application configures it, once, at the start of main().


def logging_config(verbosity: int) -> dict[str, object]:
    """The dictConfig for -q (-1), the default (0), -v (1) and -vv (2): messages go to stderr."""
    ...


# One function per subcommand. Each gets the parsed arguments and returns an exit code.


def cmd_add(args: argparse.Namespace) -> int:
    """worklog add CLIENT HOURS [--date DAY] [--note TEXT]"""
    ...


def cmd_list(args: argparse.Namespace) -> int:
    """worklog list [--week WEEK]"""
    ...


def cmd_report(args: argparse.Namespace) -> int:
    """worklog report [--week WEEK] [--format {table,csv,json}]"""
    ...


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="worklog", description="Log hours against clients and report them by week.")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument(
        "--file",
        type=Path,
        default=Path(os.environ.get("WORKLOG_FILE", DEFAULT_FILE)),
        help="the log file (default: $WORKLOG_FILE or ~/.worklog.jsonl)",
    )
    parser.add_argument("-v", "--verbose", action="count", default=0, help="say more; repeat for debug output")
    parser.add_argument("-q", "--quiet", action="store_true", help="only show errors")

    commands = parser.add_subparsers(dest="command", required=True)

    add = commands.add_parser("add", help="log hours for a client")
    add.add_argument("client", help='the client\'s name, e.g. "Millstone Coffee"')
    add.add_argument("hours", type=parse_hours, help="hours worked, as 2.5 or 2:30")
    # --date and --note
    add.set_defaults(handler=cmd_add)

    # list and report

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.config.dictConfig(logging_config(-1 if args.quiet else args.verbose))
    logger.debug("Using log file %s", args.file)
    handler = args.handler
    return int(handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
