from abc import ABC, abstractmethod


class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, order_id: str, amount_cents: int) -> str:
        """Take a payment and return the provider's payment id."""


# PayFastClient comes from the provider's SDK: you can't edit it or make it inherit from anything.
class PayFastClient:
    def charge(self, order_id: str, amount_cents: int) -> str:
        return f"pf_{order_id}_{amount_cents}"

    def ping(self) -> bool:
        return True


class PayFastAdapter(PaymentGateway):
    """Exists only so a PayFastClient can be passed where a PaymentGateway is expected."""

    def __init__(self, client: PayFastClient) -> None:
        self._client = client

    def charge(self, order_id: str, amount_cents: int) -> str:
        return self._client.charge(order_id, amount_cents)


def checkout(gateway: PaymentGateway, order_id: str, amount_cents: int) -> str:
    """Charge an order, refusing an amount that isn't positive."""
    if amount_cents <= 0:
        raise ValueError("amount must be positive")
    return gateway.charge(order_id, amount_cents)
