`active_orders(orders)` takes a list of `(order_id, status)` tuples and should return a **new** list
without the cancelled ones, in their original order:

```python
orders = [
    ("ORD-1040", "paid"),
    ("ORD-1041", "cancelled"),
    ("ORD-1042", "cancelled"),
    ("ORD-1043", "shipped"),
]
active_orders(orders)   # [("ORD-1040", "paid"), ("ORD-1043", "shipped")]
```

It lets `ORD-1042` through, and it also empties cancelled orders out of the caller's list, which the
dashboard still needs. Fix both problems.
