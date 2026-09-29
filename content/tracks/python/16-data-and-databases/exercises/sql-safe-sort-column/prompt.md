The invoices page lets the user pick a sort column, a direction, and optionally a status to
filter by, and all three arrive straight from the URL. Write
`list_invoices(conn, sort="issued_on", descending=False, status=None)`, which returns a list of
invoice numbers.

- `sort` is one of `"number"`, `"customer"`, `"amount"` or `"issued_on"`. `"amount"` sorts by the
  `amount_cents` column. Anything else raises `ValueError`.
- `descending=True` reverses the order. Ties are always broken by `number`, ascending.
- `status`, when given, keeps only invoices with that status; `None` means all of them.

```python
list_invoices(conn, sort="amount", descending=True)
# ["INV-003", "INV-001", "INV-004", "INV-002"]
list_invoices(conn, status="paid")
# ["INV-001", "INV-004"]
list_invoices(conn, sort="amount; DROP TABLE invoices")   # ValueError
```

The table is `invoices (number, customer, amount_cents, status, issued_on)`.
