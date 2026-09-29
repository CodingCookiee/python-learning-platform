from plp import hidden, test
from plp_fakes import McpHarness
from solution import WikiServer


@test("The handshake completes, and the server knows the client is ready")
def _():
    server = WikiServer()
    client = McpHarness(server.handle)
    client.initialize()
    assert server.ready is True
    client.notify("notifications/cancelled", {"requestId": 3})


@test("Unknown notifications get no reply at all")
def _():
    server = WikiServer()
    assert server.handle({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 3}}) is None
    assert server.handle({"jsonrpc": "2.0", "method": "notifications/roots/list_changed"}) is None


@test("Requests are still answered, and unknown ones still get -32601")
def _():
    client = McpHarness(WikiServer().handle)
    client.initialize()
    assert client.request("ping")["result"] == {}
    assert client.request("resources/subscribe", {"uri": "wiki://holidays"})["error"] == {
        "code": -32601, "message": "Method not found: resources/subscribe"
    }


@hidden("A request with id 0 is a request, not a notification")
def _():
    assert WikiServer().handle({"jsonrpc": "2.0", "id": 0, "method": "ping"}) == {"jsonrpc": "2.0", "id": 0, "result": {}}


@hidden("Calling a notification's method as a request is a method not found")
def _():
    server = WikiServer()
    reply = server.handle({"jsonrpc": "2.0", "id": 5, "method": "notifications/initialized"})
    assert reply["error"]["code"] == -32601
    assert server.ready is False


@hidden("Not ready until the initialized notification arrives")
def _():
    server = WikiServer()
    server.handle({"jsonrpc": "2.0", "id": 1, "method": "initialize",
                   "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t", "version": "1"}}})
    assert server.ready is False
