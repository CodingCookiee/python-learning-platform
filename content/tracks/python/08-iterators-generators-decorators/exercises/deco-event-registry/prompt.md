The payment provider sends webhooks like `{"type": "payment.refunded", "data": {...}}`, and each
type has its own class. Instead of a long `if` chain, write a class decorator that registers them:

- `event(name)` returns a class decorator. Decorating a class adds it to the module's
  `EVENT_TYPES` dict under `name`, sets the class attribute `event_name` to `name`, and returns the
  class itself, unchanged otherwise.
- Registering a second class under a name that's already taken raises `ValueError`.
- `parse_event(payload)` builds the right class from a payload, calling it with the `"data"` dict
  as keyword arguments. An unregistered type raises `ValueError` with the message
  `"unknown event type: <type>"`.

```python
from dataclasses import dataclass

@event("payment.refunded")
@dataclass
class PaymentRefunded:
    payment_id: str
    amount: int

parse_event({"type": "payment.refunded", "data": {"payment_id": "P7", "amount": 1250}})
# PaymentRefunded(payment_id="P7", amount=1250)
PaymentRefunded.event_name   # "payment.refunded"
```
