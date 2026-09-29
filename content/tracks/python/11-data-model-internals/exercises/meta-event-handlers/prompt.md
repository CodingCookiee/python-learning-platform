A shop receives webhooks like `{"type": "order.paid", "data": {...}}`, and each event type is
handled by its own class. Other teams add handlers, so a handler must register itself just by
being defined. Give `EventHandler` an `__init_subclass__` and write `dispatch(payload)`:

- `class OrderPaid(EventHandler, event="order.paid")` registers the class in
  `EventHandler.handlers` under that event and sets `OrderPaid.event`.
- A class defined with `abstract=True` is a shared base for other handlers: it's not registered
  and needs no event, but its own subclasses are registered as usual.
- Any other subclass without an event raises `TypeError` when it's defined. So does an event that
  is already registered; the message names the class that already handles it.
- `dispatch(payload)` creates the handler for `payload["type"]`, calls its `handle()` with
  `payload["data"]` and returns the result. An event with no handler raises `ValueError`.

```python
class OrderPaid(EventHandler, event="order.paid"):
    def handle(self, data):
        return f"send receipt for {data['order_id']}"

EventHandler.handlers        # {'order.paid': OrderPaid}
OrderPaid.event              # 'order.paid'
dispatch({"type": "order.paid", "data": {"order_id": "A1042"}})    # 'send receipt for A1042'
dispatch({"type": "order.lost", "data": {}})                       # ValueError
```
