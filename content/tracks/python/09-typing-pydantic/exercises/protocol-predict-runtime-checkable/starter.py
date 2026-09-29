from typing import Protocol, runtime_checkable


@runtime_checkable
class Refundable(Protocol):
    def refund(self, amount_cents: int) -> str: ...


class CardPayment:
    def refund(self, amount_cents: int) -> str:
        return f"card refund of {amount_cents}"


class GiftCard:
    def refund(self) -> str:
        return "store credit"


class Voucher:
    refund = "not refundable"


class Invoice:
    pass


for payment in [CardPayment(), GiftCard(), Voucher(), Invoice()]:
    print(type(payment).__name__, isinstance(payment, Refundable))

print(issubclass(CardPayment, Refundable))
print(Refundable in CardPayment.__mro__)

try:
    GiftCard().refund(500)
except TypeError:
    print("GiftCard can't refund 500")
