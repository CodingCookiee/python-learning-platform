`price_with_tax(net, rate)` is written for you. Use `functools.partial` to define two
one-argument versions of it:

- `uk_price(net)`, with the rate fixed at 20% (`0.20`),
- `de_price(net)`, with the rate fixed at 19% (`0.19`).

```python
uk_price(10)    # 12.0
de_price(100)   # 119.0
```

Define them with `partial`, not with `def` or `lambda`.
