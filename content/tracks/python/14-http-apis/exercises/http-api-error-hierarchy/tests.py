import httpx

import solution
from plp import hidden, test


def error_for(status, body=None, headers=None):
    if body is None:
        body = {"error": {"message": f"scripted {status}"}}
    kwargs = {"json": body} if not isinstance(body, str) else {"text": body}
    return solution.error_from_response(httpx.Response(status, headers=headers or {}, **kwargs))


@test("A 404 becomes a NotFoundError with the API's message and request ID")
def _():
    error = error_for(404, {"error": {"message": "ticket 9999 not found"}}, {"X-Request-Id": "req_8f2a"})
    assert (type(error).__name__, str(error), error.request_id) == ("NotFoundError", "HTTP 404: ticket 9999 not found", "req_8f2a")
    assert (error.message, error.status_code) == ("ticket 9999 not found", 404)


@test("Each status gets its class")
def _():
    names = {status: type(error_for(status)).__name__ for status in [400, 422, 401, 403, 404, 429, 500, 503, 504]}
    assert names == {
        400: "BadRequestError",
        422: "BadRequestError",
        401: "AuthenticationError",
        403: "AuthenticationError",
        404: "NotFoundError",
        429: "RateLimitError",
        500: "ServerError",
        503: "ServerError",
        504: "ServerError",
    }


@test("The classes form the hierarchy")
def _():
    for name in ["BadRequestError", "AuthenticationError", "NotFoundError", "RateLimitError", "ServerError"]:
        assert issubclass(getattr(solution, name), solution.HelpdeskApiError), f"{name} should be a HelpdeskApiError"
    assert issubclass(solution.HelpdeskApiError, solution.HelpdeskError)
    assert issubclass(solution.HelpdeskConnectionError, solution.HelpdeskError)
    assert not issubclass(solution.HelpdeskConnectionError, solution.HelpdeskApiError)
    assert issubclass(solution.HelpdeskError, Exception)


@test("A rate limit carries Retry-After")
def _():
    error = error_for(429, headers={"Retry-After": "30"})
    assert error.retry_after == 30.0
    assert error_for(429).retry_after is None


@hidden("Other 4xx statuses are a plain HelpdeskApiError")
def _():
    error = error_for(409, {"error": {"message": "ticket is already closed"}})
    assert type(error) is solution.HelpdeskApiError
    assert str(error) == "HTTP 409: ticket is already closed"
    assert error.request_id is None


@hidden("A body that isn't the API's error format falls back to the reason phrase")
def _():
    assert str(error_for(502, "<html>Bad Gateway</html>")) == "HTTP 502: Bad Gateway"
    assert str(error_for(500, {"detail": "boom"})) == "HTTP 500: Internal Server Error"
    assert str(error_for(400, ["not", "a", "dict"])) == "HTTP 400: Bad Request"
    assert error_for(429, headers={"Retry-After": "soon"}).retry_after is None


@hidden("Errors can be raised and caught at every level")
def _():
    try:
        raise error_for(404)
    except solution.HelpdeskError as caught:
        assert isinstance(caught, solution.NotFoundError)
    error = solution.HelpdeskApiError("teapot", status_code=418)
    assert (error.message, error.status_code, error.request_id) == ("teapot", 418, None)
