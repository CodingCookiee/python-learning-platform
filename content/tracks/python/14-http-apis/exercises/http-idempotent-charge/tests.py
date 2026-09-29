import json

import httpx

from plp import hidden, raises, test
from solution import create_charge


class Payments:
    """A fake payments API with idempotency keys.

    script is a list of what to do for each request in turn:
      "ok"        process the charge (once per key) and answer
      "lost"      process the charge, then lose the response (a ReadTimeout)
      "refused"   the connection is refused before anything is processed
      a number    answer with that error status before processing
    """

    def __init__(self, *script):
        self.script = list(script)
        self.charges = {}
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        step = self.script.pop(0) if self.script else "ok"
        if step == "refused":
            raise httpx.ConnectError("connection refused", request=request)
        if isinstance(step, int):
            return httpx.Response(step, json={"error": {"code": "scripted", "status": step}})
        key = request.headers.get("idempotency-key")
        if key is None:
            return httpx.Response(400, json={"error": {"code": "idempotency_key_required"}})
        if key not in self.charges:
            self.charges[key] = {"id": f"ch_{len(self.charges) + 1}", **json.loads(request.content)}
        if step == "lost":
            raise httpx.ReadTimeout("the response was lost", request=request)
        return httpx.Response(200, json=self.charges[key])

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self), base_url="https://api.payments.example", timeout=10)


def keys(*values):
    queue = list(values)
    return lambda: queue.pop(0)


@test("A lost response is retried with the same key, and charges once")
def _():
    payments = Payments("lost", "ok")
    waits = []
    charge = create_charge(payments.client(), 4200, "gbp", "cus_ada", sleep=waits.append, new_key=keys("key-1"))
    assert charge == {"id": "ch_1", "amount": 4200, "currency": "gbp", "customer": "cus_ada"}
    assert waits == [1]
    assert len(payments.charges) == 1


@test("Every attempt sends the same key and the same body")
def _():
    payments = Payments("refused", 503, "ok")
    create_charge(payments.client(), 1850, "eur", "cus_grace", sleep=lambda s: None, new_key=keys("key-7"))
    assert [r.headers.get("idempotency-key") for r in payments.requests] == ["key-7"] * 3
    assert [json.loads(r.content) for r in payments.requests] == [{"amount": 1850, "currency": "eur", "customer": "cus_grace"}] * 3
    assert [r.method + " " + r.url.path for r in payments.requests] == ["POST /v1/charges"] * 3


@test("Each call gets its own key; a given key is used as is")
def _():
    payments = Payments()
    client = payments.client()
    create_charge(client, 100, "gbp", "cus_ada", new_key=keys("key-1", "key-2"))
    create_charge(client, 100, "gbp", "cus_ada", new_key=keys("key-2"))
    create_charge(client, 500, "gbp", "cus_linus", idempotency_key="order-1042-payment", new_key=keys())
    assert [r.headers.get("idempotency-key") for r in payments.requests] == ["key-1", "key-2", "order-1042-payment"]
    assert len(payments.charges) == 3


@test("A declined card isn't retried")
def _():
    payments = Payments(402)
    waits = []
    error = raises(httpx.HTTPStatusError, create_charge, payments.client(), 4200, "gbp", "cus_ada", sleep=waits.append).value
    assert error.response.status_code == 402
    assert (len(payments.requests), waits) == (1, [])


@hidden("Waits 1 then 2, and raises the last error when every attempt fails")
def _():
    payments = Payments(503, 502, 504)
    waits = []
    error = raises(httpx.HTTPStatusError, create_charge, payments.client(), 4200, "gbp", "cus_ada", sleep=waits.append).value
    assert error.response.status_code == 504
    assert (len(payments.requests), waits) == (3, [1, 2])


@hidden("A timeout on the last attempt is raised; nothing was charged twice")
def _():
    payments = Payments("lost", "lost")
    raises(httpx.ReadTimeout, create_charge, payments.client(), 4200, "gbp", "cus_ada", attempts=2, sleep=lambda s: None)
    assert len(payments.charges) == 1
