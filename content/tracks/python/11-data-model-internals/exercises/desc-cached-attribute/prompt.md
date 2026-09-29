A monthly sales report computes its totals from thousands of orders, and templates read
`report.totals` dozens of times. Write a decorator class `cached_attribute` that turns a method
into an attribute computed on first read:

- The first read of `report.totals` calls the method and stores the result **in the instance's
  `__dict__`** under the attribute's name. Later reads get that stored value without the
  descriptor running at all.
- `del report.totals` throws the cached value away, so the next read computes it again.
- Assigning `report.totals = ...` replaces the cached value.
- Read on the class, `Report.totals` gives the `cached_attribute` itself.

```python
class Report:
    def __init__(self, orders):
        self.orders = orders
        self.computed = 0

    @cached_attribute
    def totals(self):
        self.computed += 1
        return sum(amount for _, amount in self.orders)

report = Report([("ORD-1", 40), ("ORD-2", 25)])
report.totals, report.totals    # (65, 65)
report.computed                 # 1
vars(report)["totals"]          # 65
```

This is how `functools.cached_property` works; write it without using that.
