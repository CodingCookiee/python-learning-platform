from datetime import date
from decimal import Decimal

from worklog.report import heading, in_week, table, totals
from worklog.store import Entry

ENTRIES = [
    Entry(date(2026, 9, 30), "Millstone Coffee", Decimal("3.00")),
    Entry(date(2026, 9, 28), "Millstone Coffee", Decimal("2.50")),
    Entry(date(2026, 9, 29), "Kiln Cafe", Decimal("1.25")),
    Entry(date(2026, 10, 5), "Kiln Cafe", Decimal("4.00")),
]


def test_in_week_filters_and_sorts() -> None:
    week = in_week(ENTRIES, date(2026, 9, 28), date(2026, 10, 4))
    assert [entry.day for entry in week] == [
        date(2026, 9, 28),
        date(2026, 9, 29),
        date(2026, 9, 30),
    ]


def test_totals_most_hours_first() -> None:
    assert totals(ENTRIES[:3]) == [
        ("Millstone Coffee", Decimal("5.50")),
        ("Kiln Cafe", Decimal("1.25")),
    ]


def test_totals_ties_by_name() -> None:
    tied = [
        Entry(date(2026, 9, 28), "B", Decimal("1")),
        Entry(date(2026, 9, 28), "A", Decimal("1")),
    ]
    assert [client for client, _ in totals(tied)] == ["A", "B"]


def test_heading() -> None:
    assert (
        heading("2026-W40", date(2026, 9, 28), date(2026, 10, 4))
        == "Week 2026-W40 (28 Sep - 4 Oct 2026)"
    )


def test_table() -> None:
    assert table([("Kiln Cafe", Decimal("1.25"))]).splitlines() == [
        "Client              Hours",
        "-------------------------",
        "Kiln Cafe            1.25",
        "-------------------------",
        "Total                1.25",
    ]
