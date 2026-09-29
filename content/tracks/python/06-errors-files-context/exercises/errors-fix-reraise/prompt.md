`charge(gateway, card, amount, retry_queue)` sends a card payment to the payment gateway and
returns its receipt. When the gateway can't be reached it raises `ConnectionError`; the charge
should then be added to `retry_queue` as `(card, amount)` and the error passed on to the caller,
whose own `except ConnectionError` backs off and tries again later.

It doesn't work. The caller's retry logic never fires, and declined cards pile up in the retry
queue. Fix `charge` so that:

- a successful charge returns the gateway's receipt and queues nothing,
- a `ConnectionError` is queued and reaches the caller as the same `ConnectionError`,
- any other error (a declined card raises `ValueError`) reaches the caller unchanged and isn't
  queued.

```python
retry_queue = []
charge(gateway, "4242", 25, retry_queue)   # "RCPT-4242-25" when the gateway is up
charge(offline, "4242", 25, retry_queue)   # raises ConnectionError: gateway timed out
retry_queue                                # [("4242", 25)]
```
