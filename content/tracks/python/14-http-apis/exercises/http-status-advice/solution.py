def advice(status_code):
    """What a client should do about a response with this status code."""
    if status_code in (401, 403):
        return "check the credentials"
    if status_code == 429:
        return "slow down and retry"
    if 200 <= status_code <= 299:
        return "done"
    if 300 <= status_code <= 399:
        return "follow the redirect"
    if 400 <= status_code <= 499:
        return "fix the request"
    if 500 <= status_code <= 599:
        return "retry later"
    raise ValueError(f"not an HTTP status code a client acts on: {status_code}")
