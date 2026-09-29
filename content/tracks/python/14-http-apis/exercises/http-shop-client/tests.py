import httpx

from plp import hidden, test
from solution import make_client


class Recorder:
    """A fake shop API that answers 200 and keeps every request."""

    def __init__(self):
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        return httpx.Response(200, json={"orders": []})


@test("Has the base URL and timeouts")
def _():
    client = make_client()
    assert str(client.base_url) == "https://api.shop.example/v2/"
    assert client.timeout == httpx.Timeout(10, connect=3)


@test("Requests go to the shop API with the default headers")
def _():
    server = Recorder()
    make_client(transport=httpx.MockTransport(server)).get("/orders", params={"status": "paid"})
    [request] = server.requests
    assert str(request.url) == "https://api.shop.example/v2/orders?status=paid"
    assert request.headers.get("accept") == "application/json"
    assert request.headers.get("user-agent") == "millstone-sync/1.0"


@test("Every request carries the timeouts")
def _():
    server = Recorder()
    make_client(transport=httpx.MockTransport(server)).get("/orders/1042")
    assert server.requests[0].extensions["timeout"] == {"connect": 3, "read": 10, "write": 10, "pool": 10}


@hidden("A request can still add or override headers")
def _():
    server = Recorder()
    client = make_client(transport=httpx.MockTransport(server))
    client.post("/orders", json={"sku": "MUG-STN"}, headers={"X-Trace-Id": "t-77", "Accept": "text/csv"})
    [request] = server.requests
    assert request.headers.get("x-trace-id") == "t-77"
    assert request.headers.get("accept") == "text/csv"
    assert request.headers.get("user-agent") == "millstone-sync/1.0"


@hidden("Each call makes a new client")
def _():
    assert make_client() is not make_client()
