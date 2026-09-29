import hashlib
import hmac


class InvalidWebhook(ValueError):
    """The webhook failed verification; the message says why."""


def verify_webhook(secret, header, body, now, tolerance=300):
    """True if the header is well formed, fresh, and has a valid v1 signature; else raise InvalidWebhook."""
    ...
