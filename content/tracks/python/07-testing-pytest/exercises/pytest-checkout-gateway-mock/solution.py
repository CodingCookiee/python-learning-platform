from decimal import Decimal
from unittest.mock import Mock

import pytest

from checkout import PaymentDeclined, checkout


@pytest.fixture
def order():
    return {"id": "order-1042", "total": Decimal("19.99"), "currency": "GBP"}


@pytest.fixture
def gateway():
    gateway = Mock()
    gateway.charge.return_value = {"id": "ch_1042"}
    return gateway


def test_a_successful_charge_marks_the_order_paid(order, gateway):
    assert checkout(order, gateway) == {"status": "paid", "charge_id": "ch_1042"}


def test_charges_in_pence_with_the_order_id_as_idempotency_key(order, gateway):
    checkout(order, gateway)
    gateway.charge.assert_called_once_with(1999, "GBP", idempotency_key="order-1042")


def test_a_declined_card_is_reported_and_not_retried(order, gateway):
    gateway.charge.side_effect = PaymentDeclined("insufficient funds")
    assert checkout(order, gateway) == {"status": "declined", "reason": "insufficient funds"}
    assert gateway.charge.call_count == 1


def test_a_free_order_is_paid_without_a_charge(gateway):
    free = {"id": "order-1043", "total": Decimal("0"), "currency": "GBP"}
    assert checkout(free, gateway)["status"] == "paid"
    gateway.charge.assert_not_called()
