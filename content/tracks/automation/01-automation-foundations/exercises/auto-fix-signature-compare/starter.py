import hashlib
import hmac


def verify_signature(secret, header, body):
    """True if header ("t=...,v1=...") carries a valid HMAC-SHA256 of "t." + body."""
    parts = dict(item.split("=", 1) for item in header.split(","))
    timestamp = parts["t"]
    message = f"{timestamp}.".encode() + body
    expected = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return expected == parts["v1"]
