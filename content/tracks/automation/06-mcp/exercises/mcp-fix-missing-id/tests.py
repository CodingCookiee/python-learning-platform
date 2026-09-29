from plp import hidden, test
from plp_fakes import McpHarness
from solution import handle


@test("The handshake completes, and ping gets an answer with its id")
def _():
    client = McpHarness(handle)
    assert client.initialize()["serverInfo"] == {"name": "kiln-orders", "version": "1.0.0"}
    assert client.request("ping") == {"jsonrpc": "2.0", "id": 2, "result": {}}


@test("String ids are echoed exactly")
def _():
    assert handle({"jsonrpc": "2.0", "id": "desk-17", "method": "ping"}) == {"jsonrpc": "2.0", "id": "desk-17", "result": {}}


@test("Id 0 is echoed too")
def _():
    assert handle({"jsonrpc": "2.0", "id": 0, "method": "ping"}) == {"jsonrpc": "2.0", "id": 0, "result": {}}


@hidden("Errors and notifications work as before")
def _():
    assert handle({"jsonrpc": "2.0", "id": 9, "method": "tools/list"}) == {
        "jsonrpc": "2.0", "id": 9, "error": {"code": -32601, "message": "Method not found: tools/list"}
    }
    assert handle({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None


@hidden("The initialize result is unchanged")
def _():
    reply = handle({"jsonrpc": "2.0", "id": 1, "method": "initialize",
                    "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t", "version": "1"}}})
    assert reply == {"jsonrpc": "2.0", "id": 1, "result": {
        "protocolVersion": "2025-06-18", "capabilities": {}, "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}}
