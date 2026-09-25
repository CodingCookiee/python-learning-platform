from plp import test, hidden
from solution import handle_event


@test("Handles a new order and rejects a zero refund")
def _():
    assert handle_event({"type": "order.created", "order": {"id": "ORD-1042", "total": 59.9}}) == "New order ORD-1042: 59.90"
    assert (
        handle_event({"type": "order.refunded", "order": {"id": "ORD-1042"}, "amount": 0})
        == "Ignored event: order.refunded"
    )


@test("Handles a refund with a positive amount")
def _():
    event = {"type": "order.refunded", "order": {"id": "ORD-1042"}, "amount": 12.5}
    assert handle_event(event) == "Refund 12.50 on ORD-1042"


@test("Handles a deleted customer")
def _():
    assert handle_event({"type": "customer.deleted", "customer_id": "cus_881"}) == "Delete customer cus_881"


@test("Ignores other event types")
def _():
    assert handle_event({"type": "invoice.sent", "invoice": {"id": "INV-7"}}) == "Ignored event: invoice.sent"


@hidden("Accepts whole-number totals and ignores extra keys")
def _():
    event = {
        "type": "order.created",
        "order": {"id": "ORD-2001", "total": 25, "currency": "GBP"},
        "sent_at": "2026-09-25T09:14:00Z",
    }
    assert handle_event(event) == "New order ORD-2001: 25.00"


@hidden("Doesn't treat a total sent as text as a new order")
def _():
    event = {"type": "order.created", "order": {"id": "ORD-2002", "total": "25.00"}}
    assert handle_event(event) == "Ignored event: order.created"


@hidden("Calls anything without a string type malformed")
def _():
    assert handle_event({"order": {"id": "ORD-1"}}) == "Malformed event"
    assert handle_event({"type": 42}) == "Malformed event"
    assert handle_event(["order.created"]) == "Malformed event"
    assert handle_event(None) == "Malformed event"
