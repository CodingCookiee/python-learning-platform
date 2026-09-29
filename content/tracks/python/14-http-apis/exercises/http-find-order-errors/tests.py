import httpx

from plp import hidden, raises, test
from solution import OrderLookupError, find_order

ORDER = {"id": 1042, "status": "paid", "total": "18.50"}


def shop(request):
    order_id = request.url.path.rsplit("/", 1)[-1]
    match order_id:
        case "1042":
            return httpx.Response(200, json=ORDER)
        case "1043":
            return httpx.Response(503, json={"error": "maintenance"})
        case "1044":
            return httpx.Response(401, json={"error": "bad API key"})
        case "1045":
            raise httpx.ReadTimeout("no answer", request=request)
        case "1046":
            raise httpx.ConnectError("connection refused", request=request)
        case "1047":
            raise httpx.RemoteProtocolError("server disconnected", request=request)
        case "1048":
            return httpx.Response(200, text="<html>Maintenance</html>", headers={"Content-Type": "text/html"})
        case "1049":
            raise KeyError("a bug in the test server's own code")
    return httpx.Response(404, json={"error": "order not found"})


client = httpx.Client(transport=httpx.MockTransport(shop), base_url="https://api.shop.example/v2", timeout=10)


@test("Finds an order, returns None for a missing one, and wraps a 503")
def _():
    assert find_order(client, 1042) == ORDER
    assert find_order(client, 9999) is None
    error = raises(OrderLookupError, find_order, client, 1043, match="^order 1043: HTTP 503$").value
    assert isinstance(error.__cause__, httpx.HTTPStatusError), "Raise it from the HTTPStatusError"


@test("Other error statuses are lookup errors too")
def _():
    raises(OrderLookupError, find_order, client, 1044, match="^order 1044: HTTP 401$")


@test("A timeout and a refused connection")
def _():
    timeout = raises(OrderLookupError, find_order, client, 1045, match="^order 1045: timed out$").value
    refused = raises(OrderLookupError, find_order, client, 1046, match="^order 1046: can't reach the shop$").value
    assert isinstance(timeout.__cause__, httpx.ReadTimeout), "Raise it from the timeout"
    assert isinstance(refused.__cause__, httpx.ConnectError), "Raise it from the ConnectError"


@test("A 200 that isn't JSON")
def _():
    error = raises(OrderLookupError, find_order, client, 1048, match="^order 1048: response wasn't JSON$").value
    assert isinstance(error.__cause__, ValueError), "Raise it from the JSON error"


@hidden("A dropped connection counts as unreachable")
def _():
    error = raises(OrderLookupError, find_order, client, 1047, match="^order 1047: can't reach the shop$").value
    assert isinstance(error.__cause__, httpx.RemoteProtocolError)


@hidden("Bugs aren't disguised as lookup errors")
def _():
    raises(KeyError, find_order, client, 1049)
