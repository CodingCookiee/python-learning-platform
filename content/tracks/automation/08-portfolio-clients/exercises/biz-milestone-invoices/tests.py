from datetime import date
from decimal import Decimal

from plp import hidden, raises, test
from solution import invoice_schedule

START = date(2026, 11, 2)
STAGES = [("Deposit", 30, 0), ("Pilot live", 40, 3), ("Handover", 30, 6)]


@test("Schedules a deposit and two milestones")
def _():
    assert invoice_schedule(7000, STAGES, start=START) == [
        {"milestone": "Deposit", "amount": Decimal("2100.00"), "due": date(2026, 11, 2)},
        {"milestone": "Pilot live", "amount": Decimal("2800.00"), "due": date(2026, 11, 23)},
        {"milestone": "Handover", "amount": Decimal("2100.00"), "due": date(2026, 12, 14)},
    ]


@test("The last invoice takes the remainder, so the total is exact")
def _():
    schedule = invoice_schedule(Decimal("999.99"), [("Deposit", 33, 0), ("Build", 33, 2), ("Handover", 34, 4)],
                                start=START)
    assert [row["amount"] for row in schedule] == [Decimal("330.00"), Decimal("330.00"), Decimal("339.99")]
    assert sum(row["amount"] for row in schedule) == Decimal("999.99")


@test("Percentages must add up to 100")
def _():
    raises(ValueError, invoice_schedule, 7000, [("Deposit", 30, 0), ("Handover", 60, 6)], start=START)


@test("Milestones can't go back in time")
def _():
    raises(ValueError, invoice_schedule, 7000, [("Deposit", 50, 2), ("Handover", 50, 1)], start=START)


@hidden("A single payment in full")
def _():
    assert invoice_schedule(1500, [("On acceptance", 100, 4)], start=START) == [
        {"milestone": "On acceptance", "amount": Decimal("1500"), "due": date(2026, 11, 30)}]


@hidden("Two milestones due the same week is fine, and amounts round half up")
def _():
    # 25% of 1234.50 is 308.625 and 13% is 160.485: both round up
    schedule = invoice_schedule(Decimal("1234.50"), [("Deposit", 25, 0), ("Pilot", 12, 2), ("Data import", 13, 2),
                                                     ("Handover", 50, 5)], start=START)
    assert [row["amount"] for row in schedule] == [
        Decimal("308.63"), Decimal("148.14"), Decimal("160.49"), Decimal("617.24")]
    assert schedule[1]["due"] == schedule[2]["due"] == date(2026, 11, 16)
