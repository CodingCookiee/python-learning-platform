"""worklog's command line: argparse, logging setup and printing. Nothing else lives here."""

import argparse
import csv
import json
import logging
import logging.config
import os
import re
import sys
from collections.abc import Sequence
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path

from worklog import __version__, report, store

logger = logging.getLogger(__name__)

DEFAULT_FILE = Path.home() / ".worklog.jsonl"
CENT = Decimal("0.01")
WEEK = re.compile(r"(\d{4})-W(\d{2})")


def parse_hours(text: str) -> Decimal:
    """ "2.5" -> Decimal("2.50") and "1:15" -> Decimal("1.25"). More than 0 and at most 24."""
    try:
        if ":" in text:
            hours, minutes = text.split(":")
            if not (hours.isdigit() and minutes.isdigit()) or int(minutes) >= 60:
                raise ValueError(text)
            value = Decimal(int(hours)) + Decimal(int(minutes)) / 60
        else:
            value = Decimal(text)
    except (ValueError, InvalidOperation):
        raise argparse.ArgumentTypeError(
            f"{text} isn't a number of hours, like 2.5 or 1:15"
        ) from None
    if not value.is_finite() or not 0 < value <= 24:
        raise argparse.ArgumentTypeError(f"{text} isn't between 0 and 24 hours")
    return value.quantize(CENT)


def parse_day(text: str) -> date:
    """ "2026-09-28" -> date(2026, 9, 28)."""
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        raise argparse.ArgumentTypeError(f"{text} isn't a date like 2026-09-28") from None


def parse_week(text: str) -> tuple[date, date]:
    """ "2026-W40" -> (Monday, Sunday) of that ISO week: (date(2026, 9, 28), date(2026, 10, 4))."""
    match = WEEK.fullmatch(text)
    try:
        if match is None:
            raise ValueError(text)
        monday = date.fromisocalendar(int(match[1]), int(match[2]), 1)
    except ValueError:
        raise argparse.ArgumentTypeError(f"{text} isn't an ISO week like 2026-W40") from None
    return monday, monday + timedelta(days=6)


def this_week() -> tuple[date, date]:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday, monday + timedelta(days=6)


def week_name(start: date) -> str:
    year, week, _ = start.isocalendar()
    return f"{year}-W{week:02d}"


def logging_config(verbosity: int) -> dict[str, object]:
    """The dictConfig for -q (-1), the default (0), -v (1) and -vv (2): messages go to stderr."""
    level = {-1: "ERROR", 0: "WARNING", 1: "INFO"}.get(verbosity, "DEBUG")
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {"plain": {"format": "worklog: %(levelname)s: %(message)s"}},
        "handlers": {
            "stderr": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
                "formatter": "plain",
            }
        },
        "root": {"level": level, "handlers": ["stderr"]},
    }


def cmd_add(args: argparse.Namespace) -> int:
    """worklog add CLIENT HOURS [--date DAY] [--note TEXT]"""
    entry = store.Entry(day=args.date, client=args.client, hours=args.hours, note=args.note)
    store.append(args.file, entry)
    print(f"Logged {entry.hours:.2f} h for {entry.client} on {entry.day}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    """worklog list [--week WEEK]"""
    for entry in report.in_week(store.load(args.file), *args.week):
        print(report.entry_line(entry))
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    """worklog report [--week WEEK] [--format {table,csv,json}]"""
    start, end = args.week
    rows = report.totals(report.in_week(store.load(args.file), start, end))
    if args.format == "csv":
        writer = csv.writer(sys.stdout, lineterminator="\n")
        writer.writerow(["client", "hours"])
        writer.writerows([client, f"{hours:.2f}"] for client, hours in rows)
    elif args.format == "json":
        print(
            json.dumps(
                [{"client": client, "hours": f"{hours:.2f}"} for client, hours in rows], indent=2
            )
        )
    else:
        print(report.heading(week_name(start), start, end))
        print()
        print(report.table(rows) if rows else "No hours logged.")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="worklog", description="Log hours against clients and report them by week."
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument(
        "--file",
        type=Path,
        default=Path(os.environ.get("WORKLOG_FILE", DEFAULT_FILE)),
        help="the log file (default: $WORKLOG_FILE or ~/.worklog.jsonl)",
    )
    parser.add_argument(
        "-v", "--verbose", action="count", default=0, help="say more; repeat for debug output"
    )
    parser.add_argument("-q", "--quiet", action="store_true", help="only show errors")

    commands = parser.add_subparsers(dest="command", required=True)

    add = commands.add_parser("add", help="log hours for a client")
    add.add_argument("client", help='the client\'s name, e.g. "Millstone Coffee"')
    add.add_argument("hours", type=parse_hours, help="hours worked, as 2.5 or 2:30")
    add.add_argument(
        "--date", type=parse_day, default=date.today(), help="YYYY-MM-DD (default: today)"
    )
    add.add_argument("--note", default="", help="what the time was for")
    add.set_defaults(handler=cmd_add)

    list_ = commands.add_parser("list", help="show one week's entries")
    list_.add_argument(
        "--week", type=parse_week, default=this_week(), help="YYYY-Www (default: this week)"
    )
    list_.set_defaults(handler=cmd_list)

    report_ = commands.add_parser("report", help="total one week's hours per client")
    report_.add_argument(
        "--week", type=parse_week, default=this_week(), help="YYYY-Www (default: this week)"
    )
    report_.add_argument("--format", choices=["table", "csv", "json"], default="table")
    report_.set_defaults(handler=cmd_report)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.config.dictConfig(logging_config(-1 if args.quiet else args.verbose))
    logger.debug("Using log file %s", args.file)
    return int(args.handler(args))


if __name__ == "__main__":
    raise SystemExit(main())
