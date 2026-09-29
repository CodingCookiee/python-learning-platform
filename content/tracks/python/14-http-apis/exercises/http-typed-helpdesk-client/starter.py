import time
from datetime import datetime
from typing import Iterator, Literal

import httpx
from pydantic import BaseModel

BASE_URL = "https://api.helpdesk.example/v2"
RETRY_STATUSES = {429, 500, 502, 503, 504}


# Models


class Ticket(BaseModel):
    id: int
    subject: str
    status: Literal["open", "pending", "closed"]
    created_at: datetime
    assignee: str | None = None


class Comment(BaseModel):
    id: str
    ticket_id: int
    body: str
    public: bool


# Errors


class HelpdeskError(Exception):
    """Anything the helpdesk client raises."""


class HelpdeskApiError(HelpdeskError):
    def __init__(self, message, *, status_code, request_id=None):
        super().__init__(f"HTTP {status_code}: {message}")
        self.message = message
        self.status_code = status_code
        self.request_id = request_id


class BadRequestError(HelpdeskApiError):
    pass


class AuthenticationError(HelpdeskApiError):
    pass


class NotFoundError(HelpdeskApiError):
    pass


class RateLimitError(HelpdeskApiError):
    def __init__(self, message, *, status_code, request_id=None, retry_after=None):
        super().__init__(message, status_code=status_code, request_id=request_id)
        self.retry_after = retry_after


class ServerError(HelpdeskApiError):
    pass


class HelpdeskConnectionError(HelpdeskError):
    pass


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
        return BadRequestError(message, **details)
    if status in (401, 403):
        return AuthenticationError(message, **details)
    if status == 404:
        return NotFoundError(message, **details)
    if response.is_server_error:
        return ServerError(message, **details)
    return HelpdeskApiError(message, **details)


# The client


class HelpdeskClient:
    def __init__(self, api_key, *, transport=None, max_attempts=3, sleep=time.sleep):
        ...

    def close(self):
        ...

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        self.close()

    def _request(self, method, path, **kwargs):
        ...

    def get_ticket(self, ticket_id: int) -> Ticket:
        ...

    def iter_tickets(self, status: str = "open") -> Iterator[Ticket]:
        ...

    def add_comment(self, ticket_id: int, body: str, *, public: bool = True) -> Comment:
        ...
