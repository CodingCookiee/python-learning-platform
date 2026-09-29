from email.utils import parsedate_to_datetime


def retry_after(response, *, now):
    """Seconds to wait, from the response's Retry-After header, or None."""
    return float(response.headers["Retry-After"])
