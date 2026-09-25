from plp import test, hidden
from solution import order_message


@test("Shipped orders are on their way, cancelled ones are unknown")
def _():
    assert order_message("shipped") == "On its way"
    assert order_message("cancelled") == "Unknown status: cancelled"


@test("Keeps the pending and paid messages")
def _():
    assert order_message("pending") == "Waiting for payment"
    assert order_message("paid") == "Preparing your order"


@test("Has a message for delivered orders")
def _():
    assert order_message("delivered") == "Delivered"


@hidden("Treats statuses as case-sensitive")
def _():
    assert order_message("Shipped") == "Unknown status: Shipped"


@hidden("Handles an empty status")
def _():
    assert order_message("") == "Unknown status: "
