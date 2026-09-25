A checkout applies a list of price adjustments in order: vouchers, percentage discounts, rounding.
Each adjustment is a function that takes a price and returns a new one. Write
`apply_all(price, steps)` that runs `price` through every step, in order, using `functools.reduce`.

```python
steps = [
    lambda p: p - 5,        # 5.00 voucher
    lambda p: p * 0.9,      # 10% off
    lambda p: round(p, 2),
]
apply_all(50, steps)   # 40.5
```

With no steps, the price comes back unchanged. This drill is practice for `reduce`, so use it
rather than a `for` loop.
