from plp import test, hidden
from solution import OrderStatus, parse_status


@test("Ignores case and surrounding spaces")
def _():
    assert parse_status("Paid") is OrderStatus.PAID
    assert parse_status(" shipped ") is OrderStatus.SHIPPED


@test("Returns None for text that isn't a status")
def _():
    assert parse_status("lost") is None


@test("Returns the enum member, not a plain string")
def _():
    assert isinstance(parse_status("pending"), OrderStatus)


@hidden("Handles capitals and empty text")
def _():
    assert parse_status("REFUNDED") is OrderStatus.REFUNDED
    assert parse_status("") is None
    assert parse_status("   ") is None
