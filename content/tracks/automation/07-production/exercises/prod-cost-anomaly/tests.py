from decimal import Decimal

from plp import hidden, test
from solution import Anomaly, cost_anomalies


def days(*costs, start=1):
    return [(f"2026-10-{start + n:02d}", Decimal(cost)) for n, cost in enumerate(costs)]


WEEK = [
    ("2026-09-28", Decimal("38.10")), ("2026-09-29", Decimal("41.90")), ("2026-09-30", Decimal("40.20")),
    ("2026-10-01", Decimal("39.75")), ("2026-10-02", Decimal("43.00")), ("2026-10-03", Decimal("40.60")),
    ("2026-10-04", Decimal("42.30")), ("2026-10-05", Decimal("610.45")),
]


@test("Catches the example's $610 day against a median of $40.60")
def _():
    assert cost_anomalies(WEEK) == [Anomaly("2026-10-05", Decimal("610.45"), Decimal("40.60"))]


@test("A spike doesn't hide the next one, or flag the days after it")
def _():
    daily = days("40", "41", "39", "400", "40", "420", "41")
    assert [a.day for a in cost_anomalies(daily)] == ["2026-10-04", "2026-10-06"]


@test("Days without enough history are skipped")
def _():
    assert cost_anomalies(days("10", "100", "1000")) == []
    assert cost_anomalies(days("10", "10", "100"), min_history=2) == [Anomaly("2026-10-03", Decimal("100"), Decimal("10"))]


@test("Only the last `window` days count, and exactly factor times isn't an anomaly")
def _():
    daily = days("100", "100", "100", "10", "10", "10", "25")
    assert cost_anomalies(daily, window=3) == [Anomaly("2026-10-07", Decimal("25"), Decimal("10"))]
    assert cost_anomalies(days("10", "10", "10", "20")) == []


@hidden("The factor is a parameter, and even-length histories use the middle two")
def _():
    daily = days("40", "42", "44", "46", "70")
    assert cost_anomalies(daily, factor=Decimal("1.5")) == [Anomaly("2026-10-05", Decimal("70"), Decimal("43"))]
    assert cost_anomalies(daily) == []
