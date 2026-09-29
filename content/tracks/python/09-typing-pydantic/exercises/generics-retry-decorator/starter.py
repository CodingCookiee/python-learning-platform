import functools
from collections.abc import Callable


def retry(times, *, on=Exception):
    """Call the decorated function up to `times` times while it raises `on`."""

    def decorate(fn):
        return fn  # replace with a wrapper that retries

    return decorate


RATES = {"EUR": 1.0, "GBP": 0.86, "USD": 1.17}


@retry(3, on=ConnectionError)
def fetch_rate(currency: str) -> float:
    """The exchange rate from EUR (pretend this calls a flaky API)."""
    return RATES[currency]
