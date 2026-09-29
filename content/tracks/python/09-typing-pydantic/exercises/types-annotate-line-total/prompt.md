These two invoice helpers work, but they have no type hints, so mypy can't check anything that calls
them. Add hints to both so that `mypy --strict` passes:

- `line_total(quantity, unit_price_cents)` takes two whole numbers and returns the line's price in
  cents.
- `format_cents(cents)` takes a whole number of cents and returns it as text.

Don't change what they do. Once the hints are right, mypy rejects `line_total("2", 450)` and
`format_cents(12.5)` before the code ever runs.

```python
line_total(2, 450)      # 900
format_cents(900)       # "9.00 EUR"
```

The tests run mypy on your code, which takes a few seconds.
