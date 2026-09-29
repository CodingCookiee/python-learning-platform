Finance wants the best customers of each month. Write
`top_customers(conn, start, end, min_revenue_cents=0, limit=5)`, which returns a list of
`(customer_name, orders, revenue_cents)`:

- Only **paid** orders placed on or after `start` and before `end` count (`start` and `end` are
  ISO dates like `"2026-09-01"`, and `placed_on` is an ISO date too).
- An order's revenue is the sum of `quantity * unit_price_cents` over its lines.
- `orders` is how many orders the customer placed, not how many lines.
- Only customers whose revenue is at least `min_revenue_cents` are included, biggest revenue first,
  ties by name, and at most `limit` of them.

```python
top_customers(conn, "2026-09-01", "2026-10-01")
# [("Acme Ltd", 2, 51000), ("Globex", 1, 36000), ("Initech", 1, 4500)]
```

The tables:

```sql
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL,
                     placed_on TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE order_lines (order_id INTEGER NOT NULL, sku TEXT NOT NULL,
                          quantity INTEGER NOT NULL, unit_price_cents INTEGER NOT NULL);
```
