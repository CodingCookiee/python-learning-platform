`DiscountCalculator` is a class with one stored value and one method, so every caller has to build
an object just to call a single method on it. Replace it with a function:

- `discounted(price, percent)` returns the price with `percent` off, rounded to 2 decimals.
- `checkout_total(prices, percent)` keeps working as before, using `discounted`.
- No classes remain.

```python
discounted(80, 25)                      # 60.0
checkout_total([19.99, 5.0, 12.5], 10)  # 33.74
```
