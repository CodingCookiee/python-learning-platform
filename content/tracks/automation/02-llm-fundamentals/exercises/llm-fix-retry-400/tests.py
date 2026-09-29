import httpx
from plp import hidden, raises, test
from plp_fakes import Fail, anthropic_api
from solution import AuthenticationError, BadRequestError, RateLimitError, ServerError, call_with_retries

BODY = {"model": "claude-haiku-4-5", "max_tokens": 200, "messages": [{"role": "user", "content": "Summarise ticket #88"}]}
HEADERS = {"x-api-key": "sk-ant-test", "anthropic-version": "2023-06-01"}
TOO_LONG = "prompt is too long: 214803 tokens > 200000 maximum"


def run(replies, headers=HEADERS, max_attempts=3):
    """Call call_with_retries against a fake API; return (the fake, the sleeps, the response)."""
    api = anthropic_api(replies)
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    sleeps = []
    response = call_with_retries(lambda: http.post("/v1/messages", headers=headers, json=BODY), max_attempts=max_attempts, sleep=sleeps.append)
    return api, sleeps, response


@test("Retries a rate limit, like the example")
def _():
    api, sleeps, response = run([Fail(429, "Slow down"), "Ticket #88: printer jam."])
    assert response.json()["content"][0]["text"] == "Ticket #88: printer jam."
    assert (len(api.requests), sleeps) == (2, [1])


@test("A 400 is raised at once, after one request and no sleep")
def _():
    api = anthropic_api([Fail(400, TOO_LONG), "never sent", "never sent"])
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    sleeps = []
    raises(BadRequestError, call_with_retries, lambda: http.post("/v1/messages", headers=HEADERS, json=BODY), sleep=sleeps.append, match="too long")
    assert len(api.requests) == 1, f"the bad request was sent {len(api.requests)} times"
    assert sleeps == []


@test("A refused key is raised at once too")
def _():
    api = anthropic_api(["never sent"])
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    sleeps = []
    bad_key = {"x-api-key": "", "anthropic-version": "2023-06-01"}
    raises(AuthenticationError, call_with_retries, lambda: http.post("/v1/messages", headers=bad_key, json=BODY), sleep=sleeps.append)
    assert (len(api.requests), sleeps) == (1, [])


@test("Server errors are retried until the attempts run out")
def _():
    api = anthropic_api([Fail(500), Fail(529), Fail(503)])
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    sleeps = []
    raises(ServerError, call_with_retries, lambda: http.post("/v1/messages", headers=HEADERS, json=BODY), sleep=sleeps.append)
    assert (len(api.requests), sleeps) == (3, [1, 2])


@hidden("Keeps backing off across several retryable failures")
def _():
    api, sleeps, response = run([Fail(429), Fail(502), Fail(429), "Done."], max_attempts=4)
    assert (response.status_code, len(api.requests), sleeps) == (200, 4, [1, 2, 4])
    api = anthropic_api([Fail(429), Fail(429)])
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    raises(RateLimitError, call_with_retries, lambda: http.post("/v1/messages", headers=HEADERS, json=BODY), max_attempts=2, sleep=lambda s: None)
