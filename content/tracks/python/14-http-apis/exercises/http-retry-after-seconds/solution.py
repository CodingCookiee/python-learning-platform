from email.utils import parsedate_to_datetime


def retry_after(response, *, now):
    """Seconds to wait, from the response's Retry-After header, or None."""
    value = response.headers.get("Retry-After")
    if value is None:
        return None
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    return max(0.0, (when - now).total_seconds())
