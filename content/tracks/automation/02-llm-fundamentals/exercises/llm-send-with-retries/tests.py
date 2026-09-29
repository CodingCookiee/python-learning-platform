import httpx
from plp import captured_logs, hidden, raises, test
from plp_fakes import Fail, anthropic_api, openai_api
from solution import BadRequestError, LLMTimeout, RateLimitError, ServerError, send_with_retries

BODY = {"model": "claude-haiku-4-5", "max_tokens": 200, "messages": [{"role": "user", "content": "Where is order #1042?"}]}
HEADERS = {"x-api-key": "sk-ant-test", "anthropic-version": "2023-06-01"}


def sender(api, timeouts=0):
    """A send() for the fake API. The first `timeouts` calls time out instead of reaching it."""
    left = {"n": timeouts}

    def handler(request):
        if left["n"]:
            left["n"] -= 1
            raise httpx.ReadTimeout("The read operation timed out", request=request)
        return api.handle(request)

    http = httpx.Client(transport=httpx.MockTransport(handler), base_url="https://api.anthropic.com")
    return lambda: http.post("/v1/messages", headers=HEADERS, json=BODY)


@test("Retries, honouring retry-after, like the example")
def _():
    api = anthropic_api([Fail(429, retry_after=3), Fail(500), Fail(529), "Order #1042 has shipped."])
    waits = []
    response = send_with_retries(sender(api), sleep=waits.append)
    assert response.json()["content"][0]["text"] == "Order #1042 has shipped."
    assert waits == [3.0, 2.0, 4.0]
    assert len(api.requests) == 4


@test("Raises what can't succeed at once")
def _():
    api = anthropic_api([Fail(400, "max_tokens: must be at least 1"), "never sent"])
    waits = []
    raises(BadRequestError, send_with_retries, sender(api), sleep=waits.append, match="at least 1")
    assert (len(api.requests), waits) == (1, [])


@test("Gives up after max_attempts and raises the last error")
def _():
    api = anthropic_api([Fail(500), Fail(503), Fail(429, "Slow down")])
    waits = []
    raises(RateLimitError, send_with_retries, sender(api), max_attempts=3, sleep=waits.append, match="Slow down")
    assert (len(api.requests), waits) == (3, [1.0, 2.0])


@test("Retries a timeout, and raises LLMTimeout when it keeps timing out")
def _():
    api = anthropic_api(["Order #1042 has shipped."])
    waits = []
    assert send_with_retries(sender(api, timeouts=1), sleep=waits.append).status_code == 200
    assert waits == [1.0]
    with raises(LLMTimeout, what="send_with_retries(a send that always times out)") as caught:
        send_with_retries(sender(api, timeouts=10), max_attempts=2, sleep=lambda seconds: None)
    assert isinstance(caught.value.__cause__, httpx.TimeoutException), "chain the httpx error (raise ... from exc)"


@test("Caps the backoff at max_delay and uses base_delay")
def _():
    api = anthropic_api([Fail(500)] * 5 + ["Done."])
    waits = []
    send_with_retries(sender(api), max_attempts=6, base_delay=0.5, max_delay=3.0, sleep=waits.append)
    assert waits == [0.5, 1.0, 2.0, 3.0, 3.0]


@hidden("Logs a warning before each retry")
def _():
    api = anthropic_api([Fail(529, "Overloaded"), Fail(429, retry_after=2), "Done."])
    with captured_logs("solution") as logs:
        send_with_retries(sender(api), sleep=lambda seconds: None)
    assert logs.levels == ["WARNING", "WARNING"]
    assert "Overloaded" in logs.messages[0]
    assert "sk-ant-test" not in logs.text


@hidden("Works for OpenAI too")
def _():
    api = openai_api([Fail(503), "Done."])
    http = httpx.Client(transport=api.transport, base_url="https://api.openai.com")
    send = lambda: http.post("/v1/chat/completions", headers={"Authorization": "Bearer sk-test"},
                             json={"model": "gpt-fake", "messages": [{"role": "user", "content": "Hi"}]})
    waits = []
    assert send_with_retries(send, sleep=waits.append).json()["choices"][0]["message"]["content"] == "Done."
    assert waits == [1.0]
    raises(ServerError, send_with_retries, lambda: httpx.Response(500, json={"error": {"message": "Boom"}}),
           max_attempts=1, sleep=waits.append)
