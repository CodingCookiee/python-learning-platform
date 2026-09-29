import functools
from collections.abc import Callable


def retry[**P, R](
    times: int, *, on: type[Exception] = Exception
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """Call the decorated function up to `times` times while it raises `on`."""
    if times < 1:
        raise ValueError("times must be at least 1")

    def decorate(fn: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            for _attempt in range(times - 1):
                try:
                    return fn(*args, **kwargs)
                except on:
                    continue
            return fn(*args, **kwargs)

        return wrapper

    return decorate


RATES = {"EUR": 1.0, "GBP": 0.86, "USD": 1.17}


@retry(3, on=ConnectionError)
def fetch_rate(currency: str) -> float:
    """The exchange rate from EUR (pretend this calls a flaky API)."""
    return RATES[currency]
