from pydantic import ValidationError

from plp import hidden, raises, test
from solution import RefundRequest


@test("Accepts a good request and refuses the example's two bad ones")
def _():
    good = RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=1600, reason="damaged")
    assert (good.refund_cents, good.reason, good.note) == (1600, "damaged", None)
    with raises(ValidationError, match="refund can't exceed the amount paid"):
        RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=5000, reason="late")
    with raises(ValidationError, match="a refund for another reason needs a note"):
        RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=500, reason="other", note=" ")


@test("A full refund is allowed, and so is 'other' with a note")
def _():
    full = RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=4050, reason="unwanted")
    assert full.refund_cents == 4050
    other = RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=500, reason="other", note="Wrong colour")
    assert other.note == "Wrong colour"


@test("Checks each field's own rules")
def _():
    with raises(ValidationError, match="reason"):
        RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=500, reason="changed my mind")
    with raises(ValidationError, match="refund_cents"):
        RefundRequest(order_id="A1042", paid_cents=4050, refund_cents=0, reason="late")
    with raises(ValidationError, match="paid_cents"):
        RefundRequest(order_id="A1042", paid_cents=-1, refund_cents=1, reason="late")


@hidden("Works from form data, and a missing note counts as blank")
def _():
    form = {"order_id": "A7", "paid_cents": "999", "refund_cents": "999", "reason": "late"}
    assert RefundRequest.model_validate(form).paid_cents == 999
    with raises(ValidationError, match="needs a note"):
        RefundRequest.model_validate({**form, "reason": "other"})
