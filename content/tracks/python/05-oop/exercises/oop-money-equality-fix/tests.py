from plp import test, hidden
from solution import Money, unique_prices


@test("Compares with other types without crashing, and deduplicates")
def _():
    assert (Money(5, "EUR") == 5) is False
    assert unique_prices([Money(5, "EUR"), Money(5, "EUR"), Money(7, "EUR")]) == [
        Money(5, "EUR"),
        Money(7, "EUR"),
    ]


@test("Still compares amount and currency")
def _():
    assert Money(5, "EUR") == Money(5, "EUR")
    assert Money(5, "EUR") != Money(5, "USD")
    assert Money(5, "EUR") != Money(6, "EUR")


@test("Equal money has equal hashes and works as a dict key")
def _():
    assert hash(Money(5, "EUR")) == hash(Money(5, "EUR"))
    fees = {Money(5, "EUR"): "standard"}
    assert fees[Money(5, "EUR")] == "standard"


@hidden("Returns NotImplemented for foreign types")
def _():
    assert Money(5, "EUR").__eq__("5 EUR") is NotImplemented
    assert Money(5, "EUR") != "5 EUR"
    assert (Money(5, "EUR") == None) is False


@hidden("A set keeps one of each price")
def _():
    prices = {Money(1, "GBP"), Money(1, "GBP"), Money(1, "EUR"), Money(2, "GBP")}
    assert len(prices) == 3
    assert Money(1, "EUR") in prices
