class HelpdeskError(Exception):
    """Anything the helpdesk client raises."""


class HelpdeskApiError(HelpdeskError):
    """The helpdesk API answered with an error status."""


# BadRequestError, AuthenticationError, NotFoundError, RateLimitError, ServerError, HelpdeskConnectionError


def error_from_response(response):
    """The right HelpdeskApiError for an error response."""
    ...
