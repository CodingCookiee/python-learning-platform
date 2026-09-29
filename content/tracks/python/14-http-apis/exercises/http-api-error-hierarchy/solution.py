class HelpdeskError(Exception):
    """Anything the helpdesk client raises."""


class HelpdeskApiError(HelpdeskError):
    """The helpdesk API answered with an error status."""

    def __init__(self, message, *, status_code, request_id=None):
        super().__init__(f"HTTP {status_code}: {message}")
        self.message = message
        self.status_code = status_code
        self.request_id = request_id


class BadRequestError(HelpdeskApiError):
    """400 or 422: the request was wrong."""


class AuthenticationError(HelpdeskApiError):
    """401 or 403: the credentials were wrong, or not allowed to do this."""


class NotFoundError(HelpdeskApiError):
    """404."""


class RateLimitError(HelpdeskApiError):
    """429: too many requests."""

    def __init__(self, message, *, status_code, request_id=None, retry_after=None):
        super().__init__(message, status_code=status_code, request_id=request_id)
        self.retry_after = retry_after


class ServerError(HelpdeskApiError):
    """5xx: the helpdesk failed."""


class HelpdeskConnectionError(HelpdeskError):
    """No response at all: a timeout or a connection problem."""


def error_from_response(response):
    """The right HelpdeskApiError for an error response."""
    status = response.status_code
    try:
        message = response.json()["error"]["message"]
    except (ValueError, KeyError, TypeError):
        message = response.reason_phrase
    details = {"status_code": status, "request_id": response.headers.get("X-Request-Id")}

    if status == 429:
        retry_after = response.headers.get("Retry-After", "").strip()
        return RateLimitError(message, retry_after=float(retry_after) if retry_after.isdigit() else None, **details)
    if status in (400, 422):
        cls = BadRequestError
    elif status in (401, 403):
        cls = AuthenticationError
    elif status == 404:
        cls = NotFoundError
    elif response.is_server_error:
        cls = ServerError
    else:
        cls = HelpdeskApiError
    return cls(message, **details)
