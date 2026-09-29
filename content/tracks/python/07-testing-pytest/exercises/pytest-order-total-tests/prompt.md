The shop's order module has no tests. Write some.

```python
# orders.py
def order_total(lines):
    """The total of an order in pence.

    lines is a list of (sku, quantity, unit_price_pence) tuples.
    """
    return sum(quantity * unit_price for sku, quantity, unit_price in lines)
```

```python
order_total([("MUG", 2, 800), ("TEA", 1, 350)])   # 1950
order_total([])                                    # 0
```

Write your tests in `test_orders.py` (the editor), importing `order_total` from `orders`. They're
graded by running them with pytest twice: against the `orders.py` above, where they must all pass,
and against copies with bugs planted in them, where at least one of your tests must fail.
The starter already has one test. On its own it passes against every buggy copy, so it isn't
enough.
