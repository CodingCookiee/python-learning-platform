Before a refund goes to the card network, the shop checks it. Write `check_refund(amount, paid)`
that returns `amount` if the refund is allowed, and otherwise raises `ValueError` with one of these
messages:

- `"refund must be more than zero"` when `amount` is zero or less,
- `"refund of <amount> is more than the <paid> paid"` when `amount` is more than `paid`.

```python
check_refund(15, 40)    # 15
check_refund(0, 40)     # ValueError: refund must be more than zero
check_refund(55, 40)    # ValueError: refund of 55 is more than the 40 paid
```

Refunding the whole amount paid is allowed.
