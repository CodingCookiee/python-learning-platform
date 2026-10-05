"""Pure functions over entries: filter by week, total per client, and format the output."""

import logging
from collections import defaultdict
from collections.abc import Iterable
from datetime import date
from decimal import Decimal

from worklog.store import Entry

logger = logging.getLogger(__name__)

CLIENT_WIDTH = 18
HOURS_WIDTH = 7
RULE = "-" * (CLIENT_WIDTH + HOURS_WIDTH)


def in_week(entries: Iterable[Entry], start: date, end: date) -> list[Entry]:
    """The entries from start to end inclusive, oldest first."""
    return sorted(
        (entry for entry in entries if start <= entry.day <= end), key=lambda entry: entry.day
    )


def totals(entries: Iterable[Entry]) -> list[tuple[str, Decimal]]:
    """Hours per client, most hours first, then by name."""
    hours: defaultdict[str, Decimal] = defaultdict(Decimal)
    for entry in entries:
        hours[entry.client] += entry.hours
    logger.debug("Totalled %d clients", len(hours))
    return sorted(hours.items(), key=lambda item: (-item[1], item[0]))


def entry_line(entry: Entry) -> str:
    """One line of `worklog list`."""
    return f"{entry.day}  {entry.client:<{CLIENT_WIDTH}}{entry.hours:>5.2f}  {entry.note}".rstrip()


def heading(week: str, start: date, end: date) -> str:
    """Week 2026-W40 (28 Sep - 4 Oct 2026)"""
    return f"Week {week} ({start.day} {start:%b} - {end.day} {end:%b} {end.year})"


def table(rows: list[tuple[str, Decimal]]) -> str:
    """The report table: a header, the rows and the total, between rules."""
    lines = [f"{'Client':<{CLIENT_WIDTH}}{'Hours':>{HOURS_WIDTH}}", RULE]
    lines += [f"{client:<{CLIENT_WIDTH}}{hours:>{HOURS_WIDTH}.2f}" for client, hours in rows]
    total = sum((hours for _, hours in rows), Decimal("0"))
    lines += [RULE, f"{'Total':<{CLIENT_WIDTH}}{total:>{HOURS_WIDTH}.2f}"]
    return "\n".join(lines)
