import hashlib
import re
from datetime import date
from decimal import Decimal

from plp import hidden, test
from solution import idempotency_key

BOOKING = {"practitioner": "Patel", "start": "2026-10-01T14:30"}
EXPECTED = "book_appointment:" + hashlib.sha256(
    b'{"practitioner":"Patel","start":"2026-10-01T14:30"}'
).hexdigest()[:16]


@test("Builds the example's key, whatever the argument order")
def _():
    assert idempotency_key("book_appointment", BOOKING) == EXPECTED
    assert idempotency_key("book_appointment", {"start": "2026-10-01T14:30", "practitioner": "Patel"}) == EXPECTED


@test("Is the tool name, a colon and 16 hex characters")
def _():
    key = idempotency_key("send_invoice_reminder", {"invoice_id": "INV-2291"})
    assert re.fullmatch(r"send_invoice_reminder:[0-9a-f]{16}", key), f"{key!r} isn't name:16-hex-characters"


@test("A different value or a different tool gives a different key")
def _():
    assert idempotency_key("book_appointment", {**BOOKING, "start": "2026-10-01T16:00"}) != EXPECTED
    assert idempotency_key("cancel_appointment", BOOKING) != EXPECTED


@hidden("Sorts nested keys too, and copes with dates and Decimals")
def _():
    one = {"order": {"id": "1042", "lines": [1, 2]}, "amount": Decimal("12.50"), "on": date(2026, 10, 1)}
    two = {"on": date(2026, 10, 1), "amount": Decimal("12.50"), "order": {"lines": [1, 2], "id": "1042"}}
    assert idempotency_key("create_refund_request", one) == idempotency_key("create_refund_request", two)
    expected = hashlib.sha256(b'{"amount":"12.50","on":"2026-10-01","order":{"id":"1042","lines":[1,2]}}').hexdigest()[:16]
    assert idempotency_key("create_refund_request", one) == f"create_refund_request:{expected}"
