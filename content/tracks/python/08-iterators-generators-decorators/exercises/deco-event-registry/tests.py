from dataclasses import dataclass

import solution
from plp import test, hidden, raises
from solution import event, parse_event


@test("Registers a class and builds it from a payload")
def _():
    solution.EVENT_TYPES.clear()

    @event("payment.refunded")
    @dataclass
    class PaymentRefunded:
        payment_id: str
        amount: int

    received = parse_event({"type": "payment.refunded", "data": {"payment_id": "P7", "amount": 1250}})
    assert received == PaymentRefunded(payment_id="P7", amount=1250)
    assert PaymentRefunded.event_name == "payment.refunded"


@test("Returns the class itself")
def _():
    solution.EVENT_TYPES.clear()

    class PaymentFailed:
        def __init__(self, payment_id, reason):
            self.payment_id = payment_id
            self.reason = reason

    registered = event("payment.failed")(PaymentFailed)
    assert registered is PaymentFailed
    assert solution.EVENT_TYPES == {"payment.failed": PaymentFailed}


@test("Unknown types are refused")
def _():
    solution.EVENT_TYPES.clear()
    with raises(ValueError, match="unknown event type: payout.created"):
        parse_event({"type": "payout.created", "data": {}})


@hidden("Several event types, each built by its own class")
def _():
    solution.EVENT_TYPES.clear()

    @event("customer.created")
    @dataclass
    class CustomerCreated:
        customer_id: str

    @event("customer.deleted")
    @dataclass
    class CustomerDeleted:
        customer_id: str
        reason: str = "requested"

    assert parse_event({"type": "customer.deleted", "data": {"customer_id": "C1"}}) == CustomerDeleted("C1")
    assert isinstance(parse_event({"type": "customer.created", "data": {"customer_id": "C2"}}), CustomerCreated)
    assert (CustomerCreated.event_name, CustomerDeleted.event_name) == ("customer.created", "customer.deleted")


@hidden("A name can only be registered once")
def _():
    solution.EVENT_TYPES.clear()

    @event("invoice.paid")
    class InvoicePaid:
        pass

    class InvoicePaidAgain:
        pass

    raises(ValueError, event("invoice.paid"), InvoicePaidAgain)
    assert solution.EVENT_TYPES["invoice.paid"] is InvoicePaid
