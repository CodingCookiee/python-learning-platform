Orders move through a fixed set of statuses, and a typo such as `"shiped"` should be a type error,
not a bug report. Define two `Literal` types and a fully typed `next_status(status, event)`:

- `OrderStatus` is one of `"pending"`, `"paid"`, `"shipped"` or `"cancelled"`.
- `OrderEvent` is one of `"pay"`, `"ship"` or `"cancel"`.
- The allowed moves are: pending + pay → paid, paid + ship → shipped, and pending or paid +
  cancel → cancelled.
- Any other combination raises `ValueError` with the message `can't <event> a <status> order`.

`mypy --strict` must pass, and mypy must reject a status or event that isn't in the lists.

```python
next_status("pending", "pay")     # "paid"
next_status("paid", "cancel")     # "cancelled"
next_status("pending", "ship")    # ValueError: can't ship a pending order
next_status("delivered", "pay")   # rejected by mypy before it runs
```
