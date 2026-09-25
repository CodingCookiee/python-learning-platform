`order_quantity(requested)` decides how many of an item go in the basket. `requested` is `None` when
the customer left the quantity box empty, which means 1. Otherwise it's the number they chose.

There's a bug report: customers set the quantity to `0` to remove an item, and it stays in the basket
with a quantity of 1.

```python
order_quantity(None)   # 1
order_quantity(3)      # 3
order_quantity(0)      # should be 0, but returns 1
```

Fix it so that only `None` becomes 1, and every number the customer chose, including 0, is kept.
