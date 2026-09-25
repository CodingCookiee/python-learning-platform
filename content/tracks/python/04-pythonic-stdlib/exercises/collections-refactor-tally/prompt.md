These two reporting functions work, but both spend most of their lines checking whether a key
exists yet. Rewrite `status_counts` with `Counter` and `orders_by_customer` with `defaultdict`.

```python
orders = [
    {"id": "A1", "customer": "ada", "status": "paid"},
    {"id": "A2", "customer": "grace", "status": "refunded"},
    {"id": "A3", "customer": "ada", "status": "paid"},
]
status_counts(orders)        # {"paid": 2, "refunded": 1}
orders_by_customer(orders)   # {"ada": ["A1", "A3"], "grace": ["A2"]}
```

Both results must still compare equal to the plain dicts shown above.
