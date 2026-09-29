import logging
import time

import httpx

log = logging.getLogger(__name__)


class LLMError(RuntimeError):
    """A failed LLM call. retryable says whether sending it again could succeed."""

    retryable = False

    def __init__(self, message, *, status=None, retry_after=None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


class AuthenticationError(LLMError):
    """401 or 403: the key is missing, wrong, or not allowed to do this."""


class BadRequestError(LLMError):
    """Any other 4xx: the request itself is wrong. Fix it; don't resend it."""


class RateLimitError(LLMError):
    """429: too many requests or tokens for now."""

    retryable = True


class ServerError(LLMError):
    """5xx, including Anthropic's 529 (overloaded)."""

    retryable = True


class LLMTimeout(LLMError):
    """No response in time, or the connection failed."""

    retryable = True


def error_from_response(response):
    """The LLMError for a failed response from either provider."""
    status = response.status_code
    if status in (401, 403):
        kind = AuthenticationError
    elif status == 429:
        kind = RateLimitError
    elif status >= 500:
        kind = ServerError
    else:
        kind = BadRequestError
    return kind(f"{error_message(response)} (HTTP {status})", status=status, retry_after=retry_after(response))


def error_message(response):
    """The provider's message from the error body, or whatever the body says."""
    try:
        return response.json()["error"]["message"]
    except (ValueError, KeyError, TypeError):
        return response.text.strip() or response.reason_phrase


def retry_after(response):
    """The retry-after header in seconds, or None."""
    try:
        return float(response.headers["retry-after"])
    except (KeyError, ValueError):
        return None


def send_with_retries(send, *, max_attempts=4, base_delay=1.0, max_delay=30.0, sleep=time.sleep):
    """Call send() until it returns a successful response, retrying what can succeed later."""
    ...
