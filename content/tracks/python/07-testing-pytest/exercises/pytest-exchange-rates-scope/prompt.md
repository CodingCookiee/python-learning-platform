The finance team's currency converter gets its rates from a provider's API, which is slow and
charges per download:

```python
# rates.py
from decimal import ROUND_HALF_UP, Decimal

import rate_feed  # the provider's client


def load_rates():
    """Download today's rates: how many units of each currency one euro buys."""
    return {code: Decimal(rate) for code, rate in rate_feed.download().items()}


def convert(amount, source, target, rates):
    """Convert a Decimal amount between currencies, rounded half-up to the cent."""
    euros = amount / rates[source]
    return (euros * rates[target]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```

In the test environment the feed always returns these rates:

```python
{"EUR": "1", "GBP": "0.85", "USD": "1.085", "JPY": "162.40"}
```

```python
convert(Decimal("100.00"), "GBP", "USD", rates)   # Decimal('127.65')
```

Write `test_rates.py`:

- A fixture called `rates` that returns `load_rates()`, scoped so that the rates are downloaded
  **once** for the whole test run, however many tests use them.
- At least three tests that use it, checking `convert` between different pairs of currencies,
  including the rounding. Don't change the shared dict in a test.

Your tests must pass on this code and catch the bugs planted in copies of it.
