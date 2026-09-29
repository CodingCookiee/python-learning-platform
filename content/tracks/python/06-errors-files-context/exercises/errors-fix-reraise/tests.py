from plp import test, hidden, raises
from solution import charge


class Gateway:
    """A fake payment gateway: up, offline, or declining every card."""

    def __init__(self, mode="up"):
        self.mode = mode
        self.error = None

    def __repr__(self):
        return f"{self.mode}_gateway"

    def charge(self, card, amount):
        if self.mode == "offline":
            self.error = ConnectionError("gateway timed out")
            raise self.error
        if self.mode == "declining":
            self.error = ValueError(f"card {card} declined")
            raise self.error
        return f"RCPT-{card}-{amount}"


@test("Returns the receipt when the gateway is up")
def _():
    retry_queue = []
    assert charge(Gateway(), "4242", 25, retry_queue) == "RCPT-4242-25"
    assert retry_queue == []


@test("Queues the charge and passes the ConnectionError on")
def _():
    retry_queue = []
    gateway = Gateway("offline")
    caught = raises(ConnectionError, charge, gateway, "4242", 25, retry_queue, match="timed out")
    assert caught.value is gateway.error, "Pass on the gateway's own exception, not a new one"
    assert retry_queue == [("4242", 25)]


@test("A declined card isn't queued, and its error is passed on unchanged")
def _():
    retry_queue = []
    gateway = Gateway("declining")
    caught = raises(ValueError, charge, gateway, "5555", 10, retry_queue, match="declined")
    assert caught.value is gateway.error
    assert retry_queue == [], "Only a ConnectionError is worth retrying"


@hidden("Queues every failed charge, in order")
def _():
    retry_queue = []
    gateway = Gateway("offline")
    for card, amount in [("4242", 25), ("1881", 7)]:
        raises(ConnectionError, charge, gateway, card, amount, retry_queue)
    assert retry_queue == [("4242", 25), ("1881", 7)]


@hidden("The re-raised error isn't chained to a copy of itself")
def _():
    gateway = Gateway("offline")
    caught = raises(ConnectionError, charge, gateway, "4242", 25, [])
    assert caught.value.__cause__ is None
    assert caught.value.__context__ is None
