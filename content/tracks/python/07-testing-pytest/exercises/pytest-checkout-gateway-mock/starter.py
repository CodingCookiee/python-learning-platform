from decimal import Decimal
from unittest.mock import Mock

from checkout import PaymentDeclined, checkout


def test_a_successful_charge_marks_the_order_paid():
    gateway = Mock()
    gateway.charge.return_value = {"id": "ch_1042"}
    order = {"id": "order-1042", "total": Decimal("19.99"), "currency": "GBP"}
    assert checkout(order, gateway)["status"] == "paid"


# Check how the gateway was called, a declined card, and a free order
