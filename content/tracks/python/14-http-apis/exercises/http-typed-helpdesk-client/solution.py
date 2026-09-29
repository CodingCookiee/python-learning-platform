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
        self._http = httpx.Client(
            base_url=BASE_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=httpx.Timeout(10, connect=3),
            transport=transport,
        )
        self._max_attempts = max_attempts
        self._sleep = sleep

    def close(self):
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        self.close()

    def _request(self, method, path, **kwargs):
        attempts = self._max_attempts if method == "GET" else 1
        for attempt in range(attempts):
            last = attempt == attempts - 1
            wait = 2 ** attempt
            try:
                response = self._http.request(method, path, **kwargs)
            except httpx.TransportError as error:
                if last:
                    raise HelpdeskConnectionError(f"{method} {path}: no response") from error
            else:
                if response.is_success:
                    return response
                error = error_from_response(response)
                if response.status_code not in RETRY_STATUSES or last:
                    raise error
                if isinstance(error, RateLimitError) and error.retry_after is not None:
                    wait = error.retry_after
            self._sleep(wait)

    def get_ticket(self, ticket_id: int) -> Ticket:
        return Ticket.model_validate(self._request("GET", f"/tickets/{ticket_id}").json())

    def iter_tickets(self, status: str = "open") -> Iterator[Ticket]:
        params = {"status": status, "limit": 100}
        while True:
            page = self._request("GET", "/tickets", params=params).json()
            for item in page["tickets"]:
                yield Ticket.model_validate(item)
            if page["next_cursor"] is None:
                return
            params["cursor"] = page["next_cursor"]

    def add_comment(self, ticket_id: int, body: str, *, public: bool = True) -> Comment:
        response = self._request("POST", f"/tickets/{ticket_id}/comments", json={"body": body, "public": public})
        return Comment.model_validate(response.json())
