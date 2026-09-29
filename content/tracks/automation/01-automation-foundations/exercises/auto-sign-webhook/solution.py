import hashlib
import hmac


def sign_webhook(secret, timestamp, body):
    """The Webhook-Signature header value: t=<timestamp>,v1=<hex HMAC-SHA256 of "t." + body>."""
    message = f"{timestamp}.".encode() + body
    signature = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={signature}"
