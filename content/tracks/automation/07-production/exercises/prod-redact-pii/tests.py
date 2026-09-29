from plp import hidden, test
from solution import luhn_ok, redact

BUSINESS = "Order 1042, INV-2291, due 2026-10-01, total 1,240.50 EUR, tracking 1234 5678 9012 3456, ref 20260930114456."


@test("Redacts the example's email, phone and card, and keeps the order number")
def _():
    assert redact("Ada (ada.byrne@example.com, +44 7700 900123) paid with 4111 1111 1111 1111 for order 1042.") == (
        "Ada ([EMAIL], [PHONE]) paid with [CARD] for order 1042."
    )


@test("Leaves order numbers, invoice ids, dates, amounts and tracking numbers alone")
def _():
    assert redact(BUSINESS) == BUSINESS
    assert redact("Order 1042, INV-2291, due 2026-10-01, tracking 1234 5678 9012 3456.") == (
        "Order 1042, INV-2291, due 2026-10-01, tracking 1234 5678 9012 3456."
    )


@test("Checks card numbers with Luhn")
def _():
    assert luhn_ok("4111111111111111") is True
    assert luhn_ok("5500000000000004") is True
    assert luhn_ok("4111111111111112") is False
    assert luhn_ok("1234567890123456") is False


@test("Redacts API keys and bearer tokens, keeping the word Bearer")
def _():
    text = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDQyIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
    assert redact(text) == "Authorization: Bearer [SECRET]"
    assert redact("Using key sk-ant-api03-AbCdEf1234567890XyZ_q for the call") == "Using key [SECRET] for the call"
    assert redact("OPENAI_API_KEY=sk-proj-9fK2mQ7xL0pR3tV8wZ1c") == "OPENAI_API_KEY=[SECRET]"


@hidden("Cards with dashes or no separators, but only valid ones")
def _():
    assert redact("Cards 5500-0000-0000-0004 and 4111111111111111 but not 4111 1111 1111 1112.") == (
        "Cards [CARD] and [CARD] but not 4111 1111 1111 1112."
    )


@hidden("Phone numbers in several formats, but not short numbers")
def _():
    assert redact("Call +44 (0)20 7946 0958, 07700-900-123 or +1 415 555 0132, not 0800 123.") == (
        "Call [PHONE], [PHONE] or [PHONE], not 0800 123."
    )


@hidden("Redacting twice changes nothing more")
def _():
    text = "Grace <grace@example.org> on 07700 900456, card 5500 0000 0000 0004, key sk-live-0123456789abcdefXYZ."
    once = redact(text)
    assert once == "Grace <[EMAIL]> on [PHONE], card [CARD], key [SECRET]."
    assert redact(once) == once
