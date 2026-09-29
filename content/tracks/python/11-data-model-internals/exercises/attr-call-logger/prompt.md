Before switching payment providers, a shop wants to know exactly how its code uses the current
gateway: which methods it calls, and with what. Write a proxy class `CallLogger(target)` that
stands in for any object:

- Reading an attribute returns the target's value. If the value is a method (anything callable),
  you get a function that records `(name, args, kwargs)` in the proxy's `calls` list and then calls
  the target's method, returning its result. It keeps the method's `__name__`.
- A call that raises is still recorded, and the exception reaches the caller unchanged.
- Assigning an attribute on the proxy sets it on the target.
- `repr(proxy)` is `CallLogger(<repr of the target>)`.

Only ordinary attribute access needs forwarding: special methods like `len()` are looked up on the
proxy's type, so they wouldn't reach `__getattr__` anyway.

```python
gateway = PaymentGateway(fee_percent=2)
logged = CallLogger(gateway)

logged.charge(50, currency="EUR")    # 'ch_1'
logged.fee_percent                   # 2
logged.fee_percent = 3
gateway.fee_percent                  # 3
logged.calls                         # [('charge', (50,), {'currency': 'EUR'})]
```

`PaymentGateway` is a fake gateway with `charge(amount, currency="GBP")`, which returns a charge
ID, and `refund(charge_id)`; the tests provide it.
