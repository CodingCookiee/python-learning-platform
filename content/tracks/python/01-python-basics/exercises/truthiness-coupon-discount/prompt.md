Write `coupon_discount(code, subtotal)` that returns the percentage discount a coupon code gives, as
an int. Customers type codes by hand, so:

- `code` may be `None` (no coupon box on that page) or blank: the discount is 0.
- Codes are case-insensitive and ignore spaces around them: `" save10 "` is `SAVE10`.
- `SAVE10` gives 10, but only when the subtotal is 50 or more. Below that it gives 0.
- `VIP20` gives 20 on any order.
- Any other code gives 0.

```python
coupon_discount("save10", 80)       # 10
coupon_discount(" SAVE10 ", 49.99)  # 0: the order is under 50
coupon_discount(None, 100)          # 0
```
