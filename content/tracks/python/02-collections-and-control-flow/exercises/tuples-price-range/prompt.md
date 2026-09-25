A product page shows "from £4.99 to £24.50". Write `price_range(prices)` that returns the lowest and
highest price as a tuple `(lowest, highest)`:

```python
price_range([12.0, 4.99, 24.5, 8.75])   # (4.99, 24.5)
low, high = price_range([12.0, 4.99, 24.5, 8.75])
```

`prices` always has at least one price.
