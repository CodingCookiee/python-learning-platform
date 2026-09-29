from itertools import islice

import httpx

from plp import hidden, raises, test
from solution import iter_invoices


def invoices(count, status="open"):
    return [{"id": f"inv_{n:03}", "amount_due": 4200 + n, "status": status} for n in range(1, count + 1)]


class Billing:
    """A fake billing API with offset pagination. Keeps the params of every request."""

    def __init__(self, records, total=None, fail_at=None):
        self.records = records
        self.total = total
        self.fail_at = fail_at
        self.requests = []

    def __call__(self, request):
        params = dict(request.url.params)
        self.requests.append(params)
        offset, limit = int(params.get("offset", 0)), int(params.get("limit", 100))
        if offset == self.fail_at:
            return httpx.Response(503, json={"error": "try again"})
        matching = [r for r in self.records if r["status"] == params.get("status")]
        total = len(matching) if self.total is None else self.total
        return httpx.Response(200, json={"data": matching[offset : offset + limit], "total": total})

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self), base_url="https://api.billing.example", timeout=10)


@test("One request for the first invoice, three for all 250")
def _():
    billing = Billing(invoices(250))
    pages = iter_invoices(billing.client())
    assert next(pages)["id"] == "inv_001"
    assert len(billing.requests) == 1, "Fetch the next page only when it's needed"
    assert len(list(pages)) == 249
    assert [r["offset"] for r in billing.requests] == ["0", "100", "200"]


@test("Sends the status and limit on every request")
def _():
    billing = Billing(invoices(5, "paid") + invoices(7))
    assert [invoice["status"] for invoice in iter_invoices(billing.client(), status="paid", limit=2)] == ["paid"] * 5
    assert billing.requests == [
        {"status": "paid", "offset": "0", "limit": "2"},
        {"status": "paid", "offset": "2", "limit": "2"},
        {"status": "paid", "offset": "4", "limit": "2"},
    ]


@test("A total that's a multiple of the limit doesn't fetch an extra page")
def _():
    billing = Billing(invoices(200))
    assert len(list(iter_invoices(billing.client()))) == 200
    assert len(billing.requests) == 2


@test("No invoices: one request, nothing yielded")
def _():
    billing = Billing([])
    assert list(iter_invoices(billing.client())) == []
    assert len(billing.requests) == 1


@hidden("An empty page stops the loop even when the total is wrong")
def _():
    billing = Billing(invoices(3), total=1000)
    assert len(list(islice(iter_invoices(billing.client(), limit=2), 50))) == 3
    assert len(billing.requests) == 3


@hidden("A failing page raises")
def _():
    billing = Billing(invoices(150), fail_at=100)
    pages = iter_invoices(billing.client())
    assert len(list(islice(pages, 100))) == 100
    raises(httpx.HTTPStatusError, list, pages)
