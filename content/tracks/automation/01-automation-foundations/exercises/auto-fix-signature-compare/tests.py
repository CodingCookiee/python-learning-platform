import hashlib
import hmac

from plp import hidden, source_uses, test
from solution import verify_signature

SECRET = "test-secret-agency"
BODY = b'{"id":"evt_1042","type":"lead.created"}'


def header_for(body, secret=SECRET, timestamp=1773072000):
    signature = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"


@test("A malformed header is rejected, not a crash")
def _():
    assert verify_signature(SECRET, "garbage", b"{}") is False


@test("Compares signatures with hmac.compare_digest")
def _():
    assert source_uses(call="compare_digest"), "use hmac.compare_digest instead of == to compare signatures"


@test("Accepts a correctly signed body and rejects a tampered one")
def _():
    assert verify_signature(SECRET, header_for(BODY), BODY) is True
    assert verify_signature(SECRET, header_for(BODY), BODY.replace(b"1042", b"1043")) is False


@test("A header with no v1 signature is rejected")
def _():
    assert verify_signature(SECRET, "t=1773072000", BODY) is False


@hidden("An empty header is rejected")
def _():
    assert verify_signature(SECRET, "", BODY) is False


@hidden("A signature made with another secret is rejected")
def _():
    assert verify_signature(SECRET, header_for(BODY, secret="someone-elses-secret"), BODY) is False


@hidden("A signature for a different timestamp is rejected")
def _():
    forged = header_for(BODY).replace("t=1773072000", "t=1773075600")
    assert verify_signature(SECRET, forged, BODY) is False
