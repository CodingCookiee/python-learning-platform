from plp import hidden, test
from plp_fakes import McpHarness
from solution import WikiServer


def connect(server):
    return McpHarness(server.handle, protocol="2026-07-28")


@test("A cancellation is recorded and gets no reply")
def _():
    server = WikiServer()
    client = connect(server)
    client.discover()
    client.notify("notifications/cancelled", {"requestId": 3})
    assert server.cancelled == [3]


@test("Unknown notifications get no reply at all")
def _():
    server = WikiServer()
    assert server.handle({"jsonrpc": "2.0", "method": "notifications/progress", "params": {"progress": 1}}) is None
    assert server.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None


@test("Requests are still answered, and unknown ones still get -32601")
def _():
    client = connect(WikiServer())
    assert client.list_resources()[0]["uri"] == "wiki://holidays"
    assert client.request("resources/subscribe", {"uri": "wiki://holidays"})["error"] == {
        "code": -32601, "message": "Method not found: resources/subscribe"}


@hidden("A request with id 0 is a request, not a notification")
def _():
    reply = connect(WikiServer()).request("resources/list", id=0)
    assert reply["result"]["resultType"] == "complete"


@hidden("Calling a notification's method as a request is a method not found")
def _():
    server = WikiServer()
    reply = connect(server).request("notifications/cancelled", {"requestId": 5})
    assert reply["error"]["code"] == -32601
    assert server.cancelled == []


@hidden("Several cancellations are all recorded, in order")
def _():
    server = WikiServer()
    client = connect(server)
    for request_id in (4, "req-9", 0):
        client.notify("notifications/cancelled", {"requestId": request_id})
    assert server.cancelled == [4, "req-9", 0]
