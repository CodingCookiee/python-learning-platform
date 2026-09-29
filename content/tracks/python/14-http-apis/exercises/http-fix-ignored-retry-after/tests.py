import httpx

from plp import hidden, raises, test
from solution import get_with_retries


class Top:
    """A fake random source whose uniform() returns the upper bound."""

    def uniform(self, low, high):
        return high


class Crm:
    """A fake CRM giving scripted answers in turn: (status, Retry-After or None)."""

    def __init__(self, *answers):
        self.answers = list(answers)
        self.requests = 0

    def __call__(self, request):
        self.requests += 1
        status, wait = self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]
        headers = {} if wait is None else {"Retry-After": wait}
        return httpx.Response(status, headers=headers, json={"contacts": []} if status == 200 else {"error": "scripted"})


def run(crm, **options):
    waits = []
    client = httpx.Client(transport=httpx.MockTransport(crm), base_url="https://api.crm.example", timeout=10)

    def call():
        return get_with_retries(client, "/v1/contacts", sleep=waits.append, rng=Top(), **options)

    call.__name__ = "get_with_retries"
    return waits, call


@test("Waits as long as Retry-After says")
def _():
    crm = Crm((429, "20"), (200, None))
    waits, call = run(crm)
    assert call().status_code == 200
    assert (crm.requests, waits) == (2, [20.0])


@test("Falls back to backoff when there's no Retry-After")
def _():
    crm = Crm((503, None), (503, "3"), (200, None))
    waits, call = run(crm)
    assert call().status_code == 200
    assert waits == [0.5, 3.0]


@test("A wait longer than max_wait raises at once")
def _():
    crm = Crm((429, "3600"), (200, None))
    waits, call = run(crm)
    error = raises(httpx.HTTPStatusError, call).value
    assert error.response.status_code == 429
    assert (crm.requests, waits) == (1, [])


@test("A wait of exactly max_wait is fine")
def _():
    crm = Crm((429, "45"), (200, None))
    waits, call = run(crm, max_wait=45)
    assert call().status_code == 200
    assert waits == [45.0]


@hidden("Still gives up after the last attempt, without a final wait")
def _():
    crm = Crm((429, "1"))
    waits, call = run(crm)
    raises(httpx.HTTPStatusError, call)
    assert (crm.requests, waits) == (5, [1.0, 1.0, 1.0, 1.0])


@hidden("Errors that aren't worth retrying still raise at once, Retry-After or not")
def _():
    crm = Crm((400, "5"))
    waits, call = run(crm)
    raises(httpx.HTTPStatusError, call)
    assert (crm.requests, waits) == (1, [])
