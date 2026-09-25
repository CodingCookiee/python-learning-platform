from datetime import date

from plp import test, hidden
from solution import Delivery, by_day, overdue


def queue():
    return [
        Delivery(date(2026, 9, 26), 2, "RB222"),
        Delivery(date(2026, 9, 25), 3, "RA333"),
        Delivery(date(2026, 9, 26), 1, "RC111"),
    ]


@test("Sorts into dispatch order and groups by day")
def _():
    assert [d.tracking for d in sorted(queue())] == ["RA333", "RC111", "RB222"]
    assert by_day(queue()) == {date(2026, 9, 25): ["RA333"], date(2026, 9, 26): ["RC111", "RB222"]}
    assert [d.tracking for d in overdue(queue(), date(2026, 9, 26))] == ["RA333"]


@test("Compares with every operator, and ties fall through to the tracking code")
def _():
    early = Delivery(date(2026, 9, 25), 3, "RA333")
    urgent = Delivery(date(2026, 9, 26), 1, "RC111")
    twin = Delivery(date(2026, 9, 26), 1, "RC112")
    assert early < urgent <= twin
    assert twin > urgent >= early


@test("Notes are per delivery and don't affect comparisons")
def _():
    first = Delivery(date(2026, 9, 26), 1, "RC111")
    second = Delivery(date(2026, 9, 26), 1, "RC111")
    first.add_note("Leave with neighbour")
    assert first.notes == ["Leave with neighbour"]
    assert second.notes == []
    assert first == second


@test("A misspelled attribute is refused")
def _():
    parcel = Delivery(date(2026, 9, 26), 1, "RC111")
    try:
        parcel.priorty = 2
    except AttributeError:
        return
    raise AssertionError("parcel.priorty = 2 should raise AttributeError: use slots")


@hidden("Uses slots rather than a __dict__")
def _():
    parcel = Delivery(date(2026, 9, 26), 1, "RC111")
    assert not hasattr(parcel, "__dict__"), "Delivery instances shouldn't have a __dict__"
    parcel.priority = 2
    assert parcel.priority == 2


@hidden("Nothing overdue, nothing to group")
def _():
    assert overdue(queue(), date(2026, 9, 1)) == []
    assert by_day([]) == {}


@hidden("by_day keeps days in date order whatever the input order")
def _():
    later = Delivery(date(2026, 10, 3), 1, "RZ9")
    sooner = Delivery(date(2026, 10, 1), 5, "RY8")
    assert list(by_day([later, sooner])) == [date(2026, 10, 1), date(2026, 10, 3)]
