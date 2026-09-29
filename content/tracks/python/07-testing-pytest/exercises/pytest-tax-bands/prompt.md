A payroll module works out income tax with marginal bands: each band's rate applies only to the
part of the income that falls inside that band.

| Band | Income | Rate |
|------|--------|------|
| Personal allowance | up to 12,570 | 0% |
| Basic | 12,570.01 to 50,270 | 20% |
| Higher | 50,270.01 to 125,140 | 40% |
| Additional | over 125,140 | 45% |

```python
# payroll.py
from decimal import ROUND_HALF_UP, Decimal

BANDS = [  # (top of the band, rate)
    (Decimal("12570"), Decimal("0.00")),
    (Decimal("50270"), Decimal("0.20")),
    (Decimal("125140"), Decimal("0.40")),
    (Decimal("Infinity"), Decimal("0.45")),
]


def income_tax(income):
    """Tax on a yearly income (a Decimal), rounded half-up to the penny."""
    tax = Decimal("0")
    lower = Decimal("0")
    for upper, rate in BANDS:
        if income > lower:
            tax += (min(income, upper) - lower) * rate
        lower = upper
    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```

```python
income_tax(Decimal("20000"))   # Decimal('1486.00'): 20% of the 7,430 above the allowance
```

Write `test_payroll.py` with a parametrized test of at least six cases, each with an id that says
what it checks (such as `"top-of-basic-band"`). Work out the expected values by hand, as Decimal
strings. Your test must pass on this code and catch the bugs planted in copies of it, one of which
only shows up when the tax comes to exactly half a penny.
