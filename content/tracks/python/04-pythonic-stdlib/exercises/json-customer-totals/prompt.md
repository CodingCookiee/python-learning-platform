The shop's API exports orders as JSON text:

```json
{"orders": [
  {"id": "A1", "customer": "grace", "total": 20.0, "status": "paid"},
  {"id": "A2", "customer": "ada", "total": 12.5, "status": "paid"},
  {"id": "A3", "customer": "grace", "total": 7.25, "status": "refunded"},
  {"id": "A4", "customer": "grace", "total": 5.1, "status": "paid"}
]}
```

Write `customer_totals(payload)` that takes that text and returns **JSON text** mapping each
customer to the total of their **paid** orders, rounded to 2 decimal places, with the keys in
alphabetical order:

```python
customer_totals(payload)   # '{"ada": 12.5, "grace": 25.1}'
```

Customers with no paid orders are left out. Text that isn't valid JSON should raise
`ValueError`.
