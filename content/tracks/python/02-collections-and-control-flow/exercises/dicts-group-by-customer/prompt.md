`orders_by_customer(orders)` takes `(order_id, customer)` pairs and should group the order IDs by
customer, keeping each customer's orders in the order they were placed:

```python
orders = [
    ("ORD-1040", "ada"),
    ("ORD-1041", "grace"),
    ("ORD-1042", "ada"),
    ("ORD-1043", "ada"),
]
orders_by_customer(orders)
# {"ada": ["ORD-1040", "ORD-1042", "ORD-1043"], "grace": ["ORD-1041"]}
```

Instead, every customer ends up with only their most recent order. Fix it.
