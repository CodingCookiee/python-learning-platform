Both functions in the invoicing module work, but they chain `map()`, `filter()` and `lambda` in a
way that's hard to read. Rewrite each one as a single list comprehension, with no `map`, `filter` or
`lambda` left.

```python
invoices = [
    {"id": "INV-7", "net": 100.0, "status": "paid", "due_day": 3},
    {"id": "INV-8", "net": 45.5, "status": "sent", "due_day": 10},
    {"id": "INV-9", "net": 20.0, "status": "sent", "due_day": 30},
]
paid_totals(invoices)          # [120.0]
overdue_ids(invoices, 14)      # ["INV-8"]
```

The results must stay exactly the same.
