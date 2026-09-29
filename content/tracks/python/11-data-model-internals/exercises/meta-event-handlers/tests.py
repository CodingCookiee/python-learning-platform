from plp import test, hidden, raises
from solution import EventHandler, dispatch


def fresh():
    """Start each test with an empty registry."""
    EventHandler.handlers.clear()


@test("Handlers register themselves and dispatch finds them")
def _():
    fresh()

    class OrderPaid(EventHandler, event="order.paid"):
        def handle(self, data):
            return f"send receipt for {data['order_id']}"

    assert EventHandler.handlers == {"order.paid": OrderPaid}
    assert OrderPaid.event == "order.paid"
    assert dispatch({"type": "order.paid", "data": {"order_id": "A1042"}}) == "send receipt for A1042"
    raises(ValueError, dispatch, {"type": "order.lost", "data": {}})


@test("A handler without an event is refused when it's defined")
def _():
    fresh()
    with raises(TypeError, what="class Forgetful(EventHandler): ..."):
        class Forgetful(EventHandler):
            def handle(self, data):
                return None

    assert EventHandler.handlers == {}


@test("Abstract bases aren't registered, but their subclasses are")
def _():
    fresh()

    class RefundHandler(EventHandler, abstract=True):
        def handle(self, data):
            return f"{self.action} {data['amount']}"

    class RefundIssued(RefundHandler, event="refund.issued"):
        action = "email customer about"

    class RefundFailed(RefundHandler, event="refund.failed"):
        action = "alert finance about"

    assert sorted(EventHandler.handlers) == ["refund.failed", "refund.issued"]
    assert dispatch({"type": "refund.failed", "data": {"amount": 30}}) == "alert finance about 30"
    assert not hasattr(RefundHandler, "event") or RefundHandler.event is None


@hidden("A second handler for the same event is refused, naming the first")
def _():
    fresh()

    class ShipmentSent(EventHandler, event="shipment.sent"):
        def handle(self, data):
            return "notify"

    with raises(TypeError, match="ShipmentSent", what="class Duplicate(EventHandler, event='shipment.sent')"):
        class Duplicate(EventHandler, event="shipment.sent"):
            pass

    assert EventHandler.handlers == {"shipment.sent": ShipmentSent}


@hidden("Subclasses of registered handlers need their own event")
def _():
    fresh()

    class OrderPaid(EventHandler, event="order.paid"):
        def handle(self, data):
            return "receipt"

    class OrderPaidInFull(OrderPaid, event="order.paid_in_full"):
        def handle(self, data):
            return "receipt and thank-you note"

    assert OrderPaidInFull.event == "order.paid_in_full"
    assert OrderPaid.event == "order.paid"
    assert dispatch({"type": "order.paid_in_full", "data": {}}) == "receipt and thank-you note"
    raises(TypeError, type, "Again", (OrderPaid,), {})
