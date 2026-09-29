The account page shows a customer's most recent orders, and support says it's wrong: it shows
orders from last year, and a customer who ordered an hour ago can't see that order at all.

`recent_orders(conn, customer, limit=3)` should return the numbers of that customer's `limit`
most recent orders, newest first, leaving out cancelled ones. Orders that haven't been processed
yet have no status (NULL) and **must** be shown. If two orders have the same `placed_on`, the
higher order number comes first.

```python
recent_orders(conn, "ada@example.com")
# ["SO-1009", "SO-1007", "SO-1004"]
```

The table:

```sql
CREATE TABLE orders (
    number    TEXT PRIMARY KEY,
    customer  TEXT NOT NULL,
    placed_on TEXT NOT NULL,   -- '2026-09-14 09:30'
    status    TEXT             -- 'paid', 'shipped', 'cancelled', or NULL until processed
)
```

Fix the query.
