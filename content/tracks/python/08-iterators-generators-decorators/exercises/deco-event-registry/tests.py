import solution
from plp import test, hidden, raises
from solution import event, parse_event


class Record:
    """A tiny stand-in for a dataclass: keyword fields, equality and a readable repr."""

    fields = ()

    def __init__(self, **values):
        unknown = set(values) - set(self.fields)
        if unknown:
            raise TypeError(f"{type(self).__name__} got unexpected fields {sorted(unknown)}")
        for name in self.fields:
            setattr(self, name, values.get(name))

    def __eq__(self, other):
        return type(self) is type(other) and vars(self) == vars(other)

    def __repr__(self):
        inside = ", ".join(f"{name}={getattr(self, name)!r}" for name in self.fields)
        return f"{type(self).__name__}({inside})"


@test("Registers a class and builds it from a payload")
def _():
    solution.EVENT_TYPES.clear()

    @event("payment.refunded")
    class PaymentRefunded(Record):
        fields = ("payment_id", "amount")

    received = parse_event({"type": "payment.refunded", "data": {"payment_id": "P7", "amount": 1250}})
    assert received == PaymentRefunded(payment_id="P7", amount=1250)
    assert PaymentRefunded.event_name == "payment.refunded"


@test("Returns the class itself")
def _():
    solution.EVENT_TYPES.clear()

    class PaymentFailed(Record):
        fields = ("payment_id", "reason")

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
    class CustomerCreated(Record):
        fields = ("customer_id",)

    @event("customer.deleted")
    class CustomerDeleted(Record):
        fields = ("customer_id", "reason")

    deleted = parse_event({"type": "customer.deleted", "data": {"customer_id": "C1", "reason": "requested"}})
    assert deleted == CustomerDeleted(customer_id="C1", reason="requested")
    assert isinstance(parse_event({"type": "customer.created", "data": {"customer_id": "C2"}}), CustomerCreated)
    assert (CustomerCreated.event_name, CustomerDeleted.event_name) == ("customer.created", "customer.deleted")


@hidden("A name can only be registered once")
def _():
    solution.EVENT_TYPES.clear()

    @event("invoice.paid")
    class InvoicePaid(Record):
        pass

    class InvoicePaidAgain(Record):
        pass

    raises(ValueError, event("invoice.paid"), InvoicePaidAgain)
    assert solution.EVENT_TYPES["invoice.paid"] is InvoicePaid
