import hashlib
import hmac


def sign_webhook(secret, timestamp, body):
    """The Webhook-Signature header value: t=<timestamp>,v1=<hex HMAC-SHA256 of "t." + body>."""
    ...
