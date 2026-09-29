Checkout charges orders through a payment gateway, which it's given as a parameter:

```python
# checkout.py
class PaymentDeclined(Exception):
    """Raised by the gateway when the card is declined."""


def checkout(order, gateway):
    """Charge an order through the payment gateway.

    order is a dict with "id", "total" (a Decimal, in pounds) and "currency".
    The gateway is charged in pence, with the order id as the idempotency key,
    so a retried request can never charge twice:

        gateway.charge(1999, "GBP", idempotency_key="order-1042")

    It returns the charge as a dict with an "id". checkout returns
    {"status": "paid", "charge_id": ...}, or {"status": "declined", "reason": ...}
    if the gateway raises PaymentDeclined. A declined card is not retried.
    An order with a total of 0 is marked paid without charging anything.
    """
    if order["total"] == 0:
        return {"status": "paid", "charge_id": None}
    pence = int(order["total"] * 100)
    try:
        charge = gateway.charge(pence, order["currency"], idempotency_key=order["id"])
    except PaymentDeclined as error:
        return {"status": "declined", "reason": str(error)}
    return {"status": "paid", "charge_id": charge["id"]}
```

Write `test_checkout.py`. Use a `Mock` as the gateway: set what `charge` returns (or raises), and
check both what `checkout` returns and exactly how it called the gateway. Your tests must pass on
this code and catch the bugs planted in copies of it.
