Payments holds any order placed by a customer on the fraud-block list. It was instant in testing,
and now it times out every night: the real block list has 100 000 customer IDs.

```python
orders = [("ORD-1", "C-7"), ("ORD-2", "C-3"), ("ORD-3", "C-7")]
held_orders(orders, ["C-7", "C-9"])
# ['ORD-1', 'ORD-3']
```

Make `held_orders` fast enough to check 5 000 orders against 100 000 blocked customers inside the
time limit. It must return exactly what it does now, in the same order.
