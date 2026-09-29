import hashlib
import hmac

from plp import hidden, raises, source_uses, test
from solution import InvalidWebhook, verify_webhook

SECRET = "test-secret-agency"
SENT_AT = 1773072000
BODY = b'{"id":"evt_1042","type":"lead.created"}'


def signature(body=BODY, secret=SECRET, timestamp=SENT_AT):
    return hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()


HEADER = f"t={SENT_AT},v1={signature()}"


@test("Accepts a fresh, correctly signed webhook; rejects one an hour old")
def _():
    assert verify_webhook(SECRET, HEADER, BODY, now=SENT_AT + 60) is True
    with raises(InvalidWebhook, match="timestamp outside tolerance", what="verify_webhook(..., now=SENT_AT + 3600)"):
        verify_webhook(SECRET, HEADER, BODY, now=SENT_AT + 3600)


@test("A tampered body is a signature mismatch")
def _():
    with raises(InvalidWebhook, match="signature mismatch", what="verify_webhook(SECRET, HEADER, tampered_body, ...)"):
        verify_webhook(SECRET, HEADER, BODY.replace(b"1042", b"9999"), now=SENT_AT)


@test("Accepts any one of several v1 signatures")
def _():
    rotating = f"t={SENT_AT},v1={signature(secret='the-old-secret')},v1={signature()}"
    assert verify_webhook(SECRET, rotating, BODY, now=SENT_AT) is True


@test("Malformed headers are reported as malformed")
def _():
    for header in ["", "garbage", f"t=soon,v1={signature()}", f"t={SENT_AT}", f"v1={signature()}"]:
        with raises(InvalidWebhook, match="malformed signature header", what=f"verify_webhook(SECRET, {header!r}, ...)"):
            verify_webhook(SECRET, header, BODY, now=SENT_AT)


@hidden("Timestamps from the future are limited too, and tolerance is inclusive")
def _():
    raises(InvalidWebhook, verify_webhook, SECRET, HEADER, BODY, SENT_AT - 301, match="tolerance")
    assert verify_webhook(SECRET, HEADER, BODY, now=SENT_AT - 300) is True
    assert verify_webhook(SECRET, HEADER, BODY, now=SENT_AT + 300) is True


@hidden("A custom tolerance is respected")
def _():
    raises(InvalidWebhook, verify_webhook, SECRET, HEADER, BODY, SENT_AT + 61, tolerance=60, match="tolerance")


@hidden("Stale is checked before the signature, and signatures are compared in constant time")
def _():
    bad = f"t={SENT_AT},v1={'0' * 64}"
    raises(InvalidWebhook, verify_webhook, SECRET, bad, BODY, SENT_AT + 3600, match="timestamp outside tolerance")
    assert source_uses(call="compare_digest"), "compare signatures with hmac.compare_digest"
