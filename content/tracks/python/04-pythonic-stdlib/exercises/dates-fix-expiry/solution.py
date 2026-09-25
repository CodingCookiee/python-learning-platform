from datetime import datetime


def is_expired(expires_at, now):
    """True once now (an aware datetime) has reached the ISO 8601 time expires_at."""
    return now >= datetime.fromisoformat(expires_at)
