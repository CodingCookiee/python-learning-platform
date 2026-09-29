import httpx
from plp import hidden, test
from plp_fakes import Fail, anthropic_api, openai_api
from solution import (
    AuthenticationError,
    BadRequestError,
    LLMError,
    RateLimitError,
    ServerError,
    error_from_response,
)

BODY = {"model": "m", "max_tokens": 50, "messages": [{"role": "user", "content": "Hi"}]}


def anthropic_response(reply, key="sk-ant-test"):
    """What the Anthropic API really answers (from the course's fake)."""
    http = httpx.Client(transport=anthropic_api([reply]).transport, base_url="https://api.anthropic.com")
    return http.post("/v1/messages", headers={"x-api-key": key, "anthropic-version": "2023-06-01"}, json=BODY)


def openai_response(reply, key="sk-test"):
    """What the OpenAI API really answers (from the course's fake)."""
    http = httpx.Client(transport=openai_api([reply]).transport, base_url="https://api.openai.com")
    return http.post("/v1/chat/completions", headers={"Authorization": f"Bearer {key}"}, json=BODY)


@test("Turns a rate limit into a RateLimitError, like the example")
def _():
    message = "Number of request tokens has exceeded your per-minute rate limit"
    error = error_from_response(anthropic_response(Fail(429, message, retry_after=2)))
    assert (type(error).__name__, error.retryable, error.retry_after) == ("RateLimitError", True, 2.0)
    assert str(error) == f"{message} (HTTP 429)"
    assert error.status == 429


@test("A refused key is an AuthenticationError, on both providers")
def _():
    for response in (anthropic_response("never sent", key=""), openai_response("never sent", key="")):
        error = error_from_response(response)
        assert isinstance(error, AuthenticationError), f"a {response.status_code} gave {type(error).__name__}"
        assert not error.retryable
        assert "header is required (HTTP 401)" in str(error)


@test("A bad request is a BadRequestError, and isn't retryable")
def _():
    error = error_from_response(openai_response(Fail(400, "Unrecognized request argument supplied: max_token")))
    assert isinstance(error, BadRequestError)
    assert (error.retryable, error.retry_after, str(error)) == (
        False, None, "Unrecognized request argument supplied: max_token (HTTP 400)",
    )


@test("Server errors and Anthropic's 529 are retryable ServerErrors")
def _():
    for status in (500, 503, 529):
        error = error_from_response(anthropic_response(Fail(status, "Overloaded")))
        assert (status, type(error).__name__, error.retryable) == (status, "ServerError", True)


@test("Every error is an LLMError and a RuntimeError")
def _():
    error = error_from_response(openai_response(Fail(500)))
    assert isinstance(error, LLMError) and isinstance(error, RuntimeError)


@hidden("Copes with a body that isn't the provider's JSON")
def _():
    html = httpx.Response(502, text="<html><h1>502 Bad Gateway</h1></html>")
    assert str(error_from_response(html)) == "<html><h1>502 Bad Gateway</h1></html> (HTTP 502)"
    assert str(error_from_response(httpx.Response(504))) == "Gateway Timeout (HTTP 504)"
    not_found = httpx.Response(404, json={"detail": "Not found"})
    assert str(error_from_response(not_found)) == f"{not_found.text} (HTTP 404)"


@hidden("Reads retry-after as seconds, and ignores values that aren't numbers")
def _():
    assert error_from_response(httpx.Response(429, headers={"retry-after": "1.5"}, json={})).retry_after == 1.5
    assert error_from_response(httpx.Response(429, headers={"retry-after": "soon"}, json={})).retry_after is None
    assert isinstance(error_from_response(httpx.Response(403, json={"error": {"message": "No access"}})), AuthenticationError)
    assert isinstance(error_from_response(httpx.Response(422, json={"error": {"message": "Bad"}})), BadRequestError)
