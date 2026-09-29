import hashlib
import hmac


class InvalidWebhook(ValueError):
    """The webhook failed verification; the message says why."""


def parse_header(header):
    """(timestamp, [signatures]) from "t=...,v1=...,v1=...", or raise InvalidWebhook."""
    timestamp, signatures = None, []
    for item in header.split(","):
        key, _, value = item.strip().partition("=")
        if key == "t":
            timestamp = value
        elif key == "v1":
            signatures.append(value)
    try:
        timestamp = int(timestamp)
    except (TypeError, ValueError):
        raise InvalidWebhook("malformed signature header") from None
    if not signatures:
        raise InvalidWebhook("malformed signature header")
    return timestamp, signatures


def verify_webhook(secret, header, body, now, tolerance=300):
    """True if the header is well formed, fresh, and has a valid v1 signature; else raise InvalidWebhook."""
    timestamp, signatures = parse_header(header)
    if abs(now - timestamp) > tolerance:
        raise InvalidWebhook("timestamp outside tolerance")
    message = f"{timestamp}.".encode() + body
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected, candidate) for candidate in signatures):
        raise InvalidWebhook("signature mismatch")
    return True
