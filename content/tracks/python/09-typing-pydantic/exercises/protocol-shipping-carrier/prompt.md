The shop compares shipping quotes from several carriers, each written by a different team, and none
of them share a base class. Define a `Carrier` protocol: anything with a `name` (str) and a
`quote(weight_grams: int, country: str) -> int` method returning cents.

Then write `cheapest_quote(carriers, weight_grams, country)`, which returns the `(name, cents)` of
the lowest quote. Ties go to the carrier listed first, and an empty list raises `ValueError`.

`RoyalMail` and `DHLExpress` fit the protocol as they are; don't change them or make them inherit
from anything. `LegacyCourier` quotes by kilograms, so mypy must refuse it. `mypy --strict` must
pass.

```python
cheapest_quote([RoyalMail(), DHLExpress()], 500, "GB")   # ("Royal Mail", 385)
cheapest_quote([RoyalMail(), DHLExpress()], 500, "DE")   # ("DHL Express", 1149)
cheapest_quote([LegacyCourier()], 500, "GB")             # rejected by mypy
```
