Write the shop's refund rule as a fully typed function:

```python
refund_cents(paid_cents, days_since_delivery, *, damaged=False) -> int
```

- Within the return window (30 days or fewer since delivery), refund everything that was paid.
- After the window, refund half (rounded down to the cent) if the item arrived damaged, and nothing
  otherwise.
- A negative number of days raises `ValueError`.

The window is a module constant, `RETURN_WINDOW_DAYS`, marked `Final` so mypy stops anyone
reassigning it. `damaged` is keyword-only, so a call has to say `damaged=True` rather than a bare
`True` that nobody can read. Money is whole cents (`int`) throughout, and `mypy --strict` must pass.

```python
refund_cents(1999, 3)                 # 1999
refund_cents(1999, 45)                # 0
refund_cents(1999, 45, damaged=True)  # 999
```
