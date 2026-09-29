import httpx

from plp import hidden, raises, test
from solution import get_with_retries


class Top:
    """A fake random source whose uniform() returns the upper bound."""

    def uniform(self, low, high):
        return high


class Carrier:
    """A fake carrier API that gives the scripted answers in turn: a status code, or an exception class."""

    def __init__(self, *answers):
        self.answers = list(answers)
        self.requests = 0

    def __call__(self, request):
        self.requests += 1
        answer = self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]
        if isinstance(answer, type):
            raise answer("scripted failure", request=request)
        return httpx.Response(answer, json={"rate": "12.40"} if answer == 200 else {"error": "scripted"})

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self), base_url="https://api.carrier.example", timeout=10)


def run(carrier, **options):
    waits = []
    client = carrier.client()

    def call():
        return get_with_retries(client, "/v1/rates/WH-01", sleep=waits.append, rng=Top(), **options)

    call.__name__ = "get_with_retries"
    return waits, call


@test("A 404 raises at once: one request, no waits")
def _():
    carrier = Carrier(404)
    waits, call = run(carrier)
    raises(httpx.HTTPStatusError, call)
    assert (carrier.requests, waits) == (1, [])


@test("Server errors are still retried, with backoff")
def _():
    carrier = Carrier(503, 502, 200)
    waits, call = run(carrier)
    assert call().json() == {"rate": "12.40"}
    assert (carrier.requests, waits) == (3, [0.5, 1.0])


@test("No other client error is retried")
def _():
    for status in [400, 401, 403, 409, 422]:
        carrier = Carrier(status)
        waits, call = run(carrier)
        raises(httpx.HTTPStatusError, call)
        assert (status, carrier.requests, waits) == (status, 1, [])


@test("Timeouts and 429 are retried")
def _():
    carrier = Carrier(httpx.ReadTimeout, 429, 200)
    waits, call = run(carrier)
    assert call().status_code == 200
    assert (carrier.requests, waits) == (3, [0.5, 1.0])


@hidden("Gives up after the last attempt, without a final wait")
def _():
    carrier = Carrier(500)
    waits, call = run(carrier)
    error = raises(httpx.HTTPStatusError, call).value
    assert error.response.status_code == 500
    assert (carrier.requests, waits) == (4, [0.5, 1.0, 2.0])


@hidden("A connection that keeps failing raises the ConnectError")
def _():
    carrier = Carrier(httpx.ConnectError)
    waits, call = run(carrier, attempts=2)
    raises(httpx.ConnectError, call)
    assert (carrier.requests, waits) == (2, [0.5])
