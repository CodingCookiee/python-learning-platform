from typing import NotRequired, TypedDict


class Refund(TypedDict):
    order_id: str
    amount_cents: int
    reason: NotRequired[str]


refund = Refund(order_id="A1042", amount_cents="lots")
print(refund)
print(type(refund).__name__)
print(refund.get("reason"))

refund["reason"] = "damaged"
print(len(refund), refund == {"order_id": "A1042", "amount_cents": "lots", "reason": "damaged"})

try:
    print(isinstance(refund, Refund))
except TypeError:
    print("TypeError")
