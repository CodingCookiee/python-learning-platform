`revenue_by_customer(orders)` should total each customer's orders. On a real export it undercounts:

```python
orders = [
    {"id": "A1", "customer": "ada", "total": 20.0},
    {"id": "A2", "customer": "grace", "total": 12.0},
    {"id": "A3", "customer": "ada", "total": 22.5},
]
revenue_by_customer(orders)
# {"ada": 22.5, "grace": 12.0}   <- Ada's first order is missing: should be 42.5
```

Find out why and fix it. The caller's list must stay in its original order.
