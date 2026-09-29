The finance team exports orders as rows shaped like `OrderRow` (already written for you). Write a
`CustomerSummary` `TypedDict` and a fully typed function that summarises the rows per customer:

```python
summarise(rows: Iterable[OrderRow]) -> dict[str, CustomerSummary]
```

- `CustomerSummary` has `orders` (how many orders, an int), `spent_cents` (their total, an int) and
  `last_order` (the latest `placed_on` date, an ISO date string).
- Customers are email addresses, matched ignoring case and surrounding spaces; the keys of the result
  are the cleaned, lowercase emails.
- The result is ordered biggest spender first, with ties in email order.
- `rows` can be any iterable: a list, a tuple or a generator reading a file.

```python
rows = [
    {"order_id": "A1", "customer": "ada@example.com", "total_cents": 1600, "placed_on": "2026-09-01"},
    {"order_id": "A2", "customer": "grace@example.com", "total_cents": 4200, "placed_on": "2026-09-03"},
    {"order_id": "A3", "customer": " Ada@Example.com", "total_cents": 900, "placed_on": "2026-09-14"},
]
summarise(rows)
# {"grace@example.com": {"orders": 1, "spent_cents": 4200, "last_order": "2026-09-03"},
#  "ada@example.com": {"orders": 2, "spent_cents": 2500, "last_order": "2026-09-14"}}
```

`mypy --strict` must pass, and mypy must reject a misspelled summary key or a row with a string total.
