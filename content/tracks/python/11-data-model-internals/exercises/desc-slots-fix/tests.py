from plp import test, hidden, raises
from solution import Tick, latest, record


@test("Loads, defaults the currency and records ticks")
def _():
    tick = record(Tick("ACME", 101.25))
    assert tick.currency == "USD"
    assert Tick("SAP", 118.4, "EUR").currency == "EUR"
    assert latest["ACME"] is tick


@test("Still slotted: no __dict__, and typos are refused")
def _():
    tick = Tick("ACME", 101.25)
    assert not hasattr(tick, "__dict__"), "Tick instances should still have no __dict__"
    with raises(AttributeError, what="tick.prcie = 3"):
        tick.prcie = 3
    assert {"symbol", "price", "currency"} <= set(Tick.__slots__)


@test("latest doesn't keep ticks alive")
def _():
    record(Tick("BETA", 7.5))
    assert "BETA" not in latest, "Nothing else refers to that tick, so it should be gone from latest"


@hidden("A newer tick replaces the older one")
def _():
    first = record(Tick("GAMMA", 10.0))
    second = record(Tick("GAMMA", 10.5))
    assert latest["GAMMA"] is second
    assert first.price == 10.0
    assert latest["GAMMA"].price == 10.5


@hidden("Fields can still be updated")
def _():
    tick = Tick("DELTA", 3.0)
    tick.price = 3.25
    tick.currency = "GBP"
    assert (tick.symbol, tick.price, tick.currency) == ("DELTA", 3.25, "GBP")
