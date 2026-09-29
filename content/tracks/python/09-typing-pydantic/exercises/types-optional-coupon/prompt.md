At checkout the coupon field is optional, so the code arrives as a string or as `None`. Write
`coupon_discount(code)`, fully typed, that returns the discount percentage from `COUPONS`:

- `None` or an unknown code gives `0`.
- Codes are matched ignoring case and surrounding spaces.

`mypy --strict` must pass, and the parameter's hint must say that `None` is allowed.

```python
coupon_discount(" vip25 ")    # 25
coupon_discount("SUMMER")     # 0
coupon_discount(None)         # 0
```
