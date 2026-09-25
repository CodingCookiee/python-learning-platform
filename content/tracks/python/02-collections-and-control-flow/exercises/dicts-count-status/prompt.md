Write `count_by_status(orders)` that takes a list of `(order_id, status)` tuples and returns a dict
from each status to how many orders have it:

```python
orders = [
    ("ORD-1040", "paid"),
    ("ORD-1041", "shipped"),
    ("ORD-1042", "paid"),
    ("ORD-1043", "refunded"),
    ("ORD-1044", "paid"),
]
count_by_status(orders)   # {"paid": 3, "shipped": 1, "refunded": 1}
```

The statuses must appear in the order they're first seen in `orders`, because the dashboard shows
them in that order. No orders means an empty dict.
