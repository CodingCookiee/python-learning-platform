from plp import test, hidden
from solution import ttl_cache

RATES = {"EUR": 1.17, "USD": 1.27, "JPY": 187.2}


class Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now


def rate_service(clock, seconds=60):
    """An exchange_rate function decorated with ttl_cache, and the list of fetches it made."""
    fetches = []

    @ttl_cache(seconds, clock=clock)
    def exchange_rate(currency):
        """The rate for one pound in currency."""
        fetches.append(currency)
        return RATES[currency]

    return exchange_rate, fetches


@test("Reuses an answer until it expires")
def _():
    clock = Clock()
    exchange_rate, fetches = rate_service(clock)
    assert exchange_rate("EUR") == 1.17
    assert exchange_rate("EUR") == 1.17
    assert fetches == ["EUR"]
    clock.now = 60.0
    assert exchange_rate("EUR") == 1.17
    assert fetches == ["EUR", "EUR"]


@test("An answer is fresh for just under the time limit")
def _():
    clock = Clock()
    exchange_rate, fetches = rate_service(clock, seconds=30)
    exchange_rate("USD")
    clock.now = 29.9
    exchange_rate("USD")
    assert fetches == ["USD"]
    clock.now = 30.0
    exchange_rate("USD")
    assert fetches == ["USD", "USD"]


@test("Each set of arguments has its own entry and its own expiry")
def _():
    clock = Clock()
    exchange_rate, fetches = rate_service(clock)
    exchange_rate("EUR")
    clock.now = 40.0
    exchange_rate("USD")
    exchange_rate("EUR")
    clock.now = 70.0
    exchange_rate("EUR")  # expired: computed at 0
    exchange_rate("USD")  # still fresh: computed at 40
    assert fetches == ["EUR", "USD", "EUR"]


@test("Keeps the function's name and docstring")
def _():
    exchange_rate, _ = rate_service(Clock())
    assert exchange_rate.__name__ == "exchange_rate"
    assert exchange_rate.__doc__ == "The rate for one pound in currency."


@hidden("Keyword arguments are part of the key")
def _():
    clock = Clock()
    calls = []

    @ttl_cache(10, clock=clock)
    def price(amount, currency="GBP"):
        calls.append((amount, currency))
        return f"{amount} {currency}"

    assert price(5, currency="EUR") == "5 EUR"
    assert price(5, currency="EUR") == "5 EUR"
    assert price(5, currency="USD") == "5 USD"
    assert calls == [(5, "EUR"), (5, "USD")]


@hidden("An exception isn't cached")
def _():
    clock = Clock()
    exchange_rate, fetches = rate_service(clock)
    for _ in range(2):
        try:
            exchange_rate("XXX")
        except KeyError:
            pass
        else:
            raise AssertionError('exchange_rate("XXX") should raise KeyError both times')
    assert fetches == ["XXX", "XXX"]


@hidden("cache_clear forgets everything")
def _():
    clock = Clock()
    exchange_rate, fetches = rate_service(clock)
    exchange_rate("JPY")
    exchange_rate.cache_clear()
    exchange_rate("JPY")
    assert fetches == ["JPY", "JPY"]
