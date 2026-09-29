import asyncio

from plp import hidden, test
from solution import deliver_all


class WebhookClient:
    """A fake async HTTP client. Each URL answers with a status code or raises an exception."""

    def __init__(self, answers):
        self.answers = answers
        self.in_flight = 0
        self.peak = 0

    async def post(self, url):
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(0.01)
        finally:
            self.in_flight -= 1
        answer = self.answers[url]
        if isinstance(answer, Exception):
            raise answer
        return answer


def hook(name):
    return {"id": f"wh_{name}", "url": f"https://{name}.example.com/hooks"}


@test("Reports delivered and failed webhooks")
async def _():
    client = WebhookClient({
        "https://warehouse.example.com/hooks": 200,
        "https://erp.example.com/hooks": ConnectionError("connection refused"),
        "https://crm.example.com/hooks": 202,
    })
    assert await deliver_all(client, [hook("warehouse"), hook("erp"), hook("crm")]) == {
        "delivered": ["wh_warehouse", "wh_crm"],
        "failed": {"wh_erp": "ConnectionError: connection refused"},
    }


@test("A status outside 2xx is a failure")
async def _():
    client = WebhookClient({"https://billing.example.com/hooks": 503, "https://crm.example.com/hooks": 204})
    assert await deliver_all(client, [hook("billing"), hook("crm")]) == {
        "delivered": ["wh_crm"],
        "failed": {"wh_billing": "HTTP 503"},
    }


@test("Posts to every webhook at once")
async def _():
    names = ["warehouse", "erp", "crm", "billing", "analytics"]
    client = WebhookClient({hook(name)["url"]: 200 for name in names})
    await deliver_all(client, [hook(name) for name in names])
    assert client.peak == 5, f"at most {client.peak} request(s) were in flight at once"


@hidden("Every webhook is tried even when several fail, and the order is kept")
async def _():
    client = WebhookClient({
        "https://erp.example.com/hooks": TimeoutError("read timed out"),
        "https://crm.example.com/hooks": 500,
        "https://warehouse.example.com/hooks": ConnectionResetError("reset by peer"),
        "https://analytics.example.com/hooks": 299,
    })
    report = await deliver_all(client, [hook("erp"), hook("crm"), hook("warehouse"), hook("analytics")])
    assert report == {
        "delivered": ["wh_analytics"],
        "failed": {
            "wh_erp": "TimeoutError: read timed out",
            "wh_crm": "HTTP 500",
            "wh_warehouse": "ConnectionResetError: reset by peer",
        },
    }
    assert list(report["failed"]) == ["wh_erp", "wh_crm", "wh_warehouse"]


@hidden("No webhooks, an empty report")
async def _():
    assert await deliver_all(WebhookClient({}), []) == {"delivered": [], "failed": {}}
