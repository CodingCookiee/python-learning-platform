from plp import test, hidden
from solution import make_formatter


def formatter(symbol, **options):
    made = make_formatter(symbol, **options)
    assert callable(made), f"make_formatter should return a function, but it returned {made!r}"
    return made


@test("Formats pounds and yen")
def _():
    gbp = formatter("£")
    yen = formatter("¥", decimals=0)
    assert gbp(1234.5) == "£1,234.50"
    assert yen(1500) == "¥1,500"


@test("Puts the minus sign before the symbol")
def _():
    gbp = formatter("£")
    assert gbp(-5) == "-£5.00"


@hidden("Each formatter keeps its own settings")
def _():
    formatters = [formatter(symbol, decimals=places) for symbol, places in [("€", 2), ("₹", 1), ("$", 3)]]
    assert [fmt(1000) for fmt in formatters] == ["€1,000.00", "₹1,000.0", "$1,000.000"]


@hidden("Handles zero and large amounts")
def _():
    gbp = formatter("£")
    assert gbp(0) == "£0.00"
    assert gbp(2_500_000.456) == "£2,500,000.46"
