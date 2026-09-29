A bank export gives you payments as dicts with `id`, `amount` and `currency`. Write
`import_payments(rows)` that totals the good rows per currency and reports every rejected row
instead of stopping at the first one.

It returns a dict with two keys:

- `"totals"`: each currency mapped to the sum of its amounts, as a `Decimal`, in the order the
  currencies first appear,
- `"rejected"`: a list of `(row_number, reason)` tuples, numbering rows from 1, where the reason is
  `"missing <key>"` for a row without `amount` or `currency` (check `amount` first), or
  `"bad amount '<amount>'"` when the amount isn't a number.

```python
rows = [
    {"id": "P-1", "amount": "12.50", "currency": "EUR"},
    {"id": "P-2", "amount": "n/a", "currency": "EUR"},
    {"id": "P-3", "amount": "7.25", "currency": "GBP"},
    {"id": "P-4", "amount": "3.00"},
    {"id": "P-5", "amount": "-2.50", "currency": "EUR"},
]
import_payments(rows)
# {"totals": {"EUR": Decimal("10.00"), "GBP": Decimal("7.25")},
#  "rejected": [(2, "bad amount 'n/a'"), (4, "missing currency")]}
```

Negative amounts are refunds and count normally. `Decimal("n/a")` raises
`decimal.InvalidOperation`.
