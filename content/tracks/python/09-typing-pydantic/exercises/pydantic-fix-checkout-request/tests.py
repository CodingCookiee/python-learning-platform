from pydantic import ValidationError

from plp import hidden, raises, test
from solution import CartItem, CheckoutRequest

MINIMAL = {"cart_id": "c_981", "items": [{"sku": "MUG-01", "quantity": 1}]}


@test("Accepts a request without a coupon or gift message")
def _():
    request = CheckoutRequest.model_validate(MINIMAL)
    assert request.coupon is None
    assert request.gift_message == ""
    assert request.items == [CartItem(sku="MUG-01", quantity=1)]


@test("Refuses a quantity of 0")
def _():
    with raises(ValidationError, match="greater than 0"):
        CheckoutRequest.model_validate({"cart_id": "c_981", "items": [{"sku": "MUG-01", "quantity": 0}]})


@test("Still takes a coupon and a gift message when they're sent")
def _():
    request = CheckoutRequest.model_validate({**MINIMAL, "coupon": "VIP25", "gift_message": "Happy birthday!"})
    assert request.coupon == "VIP25"
    assert request.gift_message == "Happy birthday!"


@hidden("Keeps the other rules")
def _():
    with raises(ValidationError, match="items"):
        CheckoutRequest.model_validate({"cart_id": "c_981", "items": []})
    with raises(ValidationError, match="gift_message"):
        CheckoutRequest.model_validate({**MINIMAL, "gift_message": "x" * 201})
    with raises(ValidationError, match="quantity"):
        CartItem(sku="MUG-01", quantity=-2)
    assert CheckoutRequest.model_validate({**MINIMAL, "coupon": None}).coupon is None
