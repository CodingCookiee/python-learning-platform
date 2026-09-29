from typing import Protocol


class PaymentGateway(Protocol):
    def charge(self, order_id: str, amount_cents: int) -> str:
        """Take a payment and return the provider's payment id."""
        ...


# PayFastClient comes from the provider's SDK: you can't edit it or make it inherit from anything.
class PayFastClient:
    def charge(self, order_id: str, amount_cents: int) -> str:
        return f"pf_{order_id}_{amount_cents}"

    def ping(self) -> bool:
        return True


def checkout(gateway: PaymentGateway, order_id: str, amount_cents: int) -> str:
    """Charge an order, refusing an amount that isn't positive."""
    if amount_cents <= 0:
        raise ValueError("amount must be positive")
    return gateway.charge(order_id, amount_cents)
