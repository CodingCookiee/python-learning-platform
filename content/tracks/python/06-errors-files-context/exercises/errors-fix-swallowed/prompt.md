`total_payments(rows)` adds up a day's card payments from a bank export. Rows whose amount isn't a
number (the bank writes `"n/a"` for a failed payment) should be skipped. Yet it reports a total of
zero for every file, and never raises an error.

```python
rows = [
    {"id": "P-1001", "amount": "12.50"},
    {"id": "P-1002", "amount": "n/a"},
    {"id": "P-1003", "amount": "7.25"},
]
total_payments(rows)   # should be Decimal("19.75"), returns Decimal("0")
```

Fix it so that:

- amounts that aren't numbers are skipped (`Decimal("n/a")` raises `decimal.InvalidOperation`),
- a row with no `amount` key at all stops the import with a `KeyError`, because that means the
  export itself is broken,
- nothing else is caught.
