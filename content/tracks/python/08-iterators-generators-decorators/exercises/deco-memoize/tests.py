from plp import test, hidden, raises, source_avoids
from solution import memoize


class RatesAPI:
    """A fake paid rates API that records every request."""

    RATES = {("GBP", "EUR"): 1.17, ("GBP", "USD"): 1.27, ("EUR", "USD"): 1.09}

    def __init__(self):
        self.requests = []

    def rate(self, source, target, day="today"):
        self.requests.append((source, target, day))
        return self.RATES[(source, target)]


def make_lookup(api):
    @memoize
    def exchange_rate(source, target, *, day="today"):
        """Look up a rate from the (slow, paid) rates API."""
        return api.rate(source, target, day)

    return exchange_rate


@test("Answers a repeated call from the cache")
def _():
    api = RatesAPI()
    exchange_rate = make_lookup(api)
    assert exchange_rate("GBP", "EUR") == 1.17
    assert exchange_rate("GBP", "EUR") == 1.17
    assert (exchange_rate.hits, exchange_rate.misses) == (1, 1)
    assert api.requests == [("GBP", "EUR", "today")]


@test("Different arguments are cached separately")
def _():
    api = RatesAPI()
    exchange_rate = make_lookup(api)
    exchange_rate("GBP", "EUR")
    exchange_rate("GBP", "USD")
    exchange_rate("GBP", "EUR", day="2026-09-28")
    exchange_rate("GBP", "USD")
    assert (exchange_rate.hits, exchange_rate.misses) == (1, 3)
    assert len(api.requests) == 3


@test("Keeps the name and docstring, without functools' caches")
def _():
    exchange_rate = make_lookup(RatesAPI())
    assert exchange_rate.__name__ == "exchange_rate"
    assert exchange_rate.__doc__ == "Look up a rate from the (slow, paid) rates API."
    assert source_avoids(name="functools.cache"), "write the cache yourself, without functools.cache"
    assert source_avoids(name="functools.lru_cache"), "write the cache yourself, without functools.lru_cache"


@hidden("Keyword order doesn't matter")
def _():
    calls = []

    @memoize
    def shipping_quote(weight_kg, *, country, express=False):
        calls.append(weight_kg)
        return (weight_kg, country, express)

    shipping_quote(2, country="FR", express=True)
    assert shipping_quote(2, express=True, country="FR") == (2, "FR", True)
    assert (shipping_quote.hits, shipping_quote.misses, len(calls)) == (1, 1, 1)


@hidden("cache_clear forgets results and resets the counts")
def _():
    api = RatesAPI()
    exchange_rate = make_lookup(api)
    exchange_rate("GBP", "EUR")
    exchange_rate("GBP", "EUR")
    exchange_rate.cache_clear()
    assert (exchange_rate.hits, exchange_rate.misses) == (0, 0)
    exchange_rate("GBP", "EUR")
    assert len(api.requests) == 2


@hidden("Unhashable arguments skip the cache")
def _():
    calls = []

    @memoize
    def basket_total(prices):
        calls.append(prices)
        return sum(prices)

    assert basket_total([1, 2]) == 3
    assert basket_total([1, 2]) == 3
    assert (basket_total.hits, basket_total.misses, len(calls)) == (0, 0, 2)


@hidden("Errors aren't cached")
def _():
    api = RatesAPI()
    exchange_rate = make_lookup(api)
    raises(KeyError, exchange_rate, "JPY", "GBP")
    raises(KeyError, exchange_rate, "JPY", "GBP")
    assert len(api.requests) == 2
