import httpx


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
    ...
