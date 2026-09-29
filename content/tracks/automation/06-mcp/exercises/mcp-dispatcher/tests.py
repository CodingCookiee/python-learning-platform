from plp import captured_logs, hidden, test
from plp_fakes import McpHarness
from solution import Dispatcher, InvalidParams

ORDERS = {"1042": {"status": "shipped"}}


def order_desk():
    """A small server built on the learner's Dispatcher, plus a record of what ran."""
    rpc = Dispatcher()
    seen = []

    @rpc.method("initialize")
    def initialize(params):
        return {"protocolVersion": params["protocolVersion"], "capabilities": {"tools": {}},
                "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}

    @rpc.method("ping")
    def ping(params):
        return {}

    @rpc.method("orders/status")
    def status(params):
        if "order_id" not in params:
            raise InvalidParams("order_id is required")
        if params["order_id"] == "0000":
            raise RuntimeError("connection to db-eu-2.internal:5432 refused")
        return ORDERS[params["order_id"]]

    @rpc.notification("notifications/initialized")
    def initialized(params):
        seen.append("initialized")

    @rpc.notification("notifications/cancelled")
    def cancelled(params):
        raise KeyError(params["requestId"])

    return rpc, seen, ping


@test("Answers ping, and the decorators return the function unchanged")
def _():
    rpc, seen, ping = order_desk()
    assert rpc.handle({"jsonrpc": "2.0", "id": 1, "method": "ping"}) == {"jsonrpc": "2.0", "id": 1, "result": {}}
    assert ping({}) == {}


@test("A full handshake through the harness, with the notification handled")
def _():
    rpc, seen, _ = order_desk()
    client = McpHarness(rpc.handle)
    assert client.initialize()["serverInfo"]["name"] == "kiln-orders"
    assert seen == ["initialized"]
    assert client.request("orders/status", {"order_id": "1042"})["result"] == {"status": "shipped"}


@test("Unknown methods, and params that aren't an object")
def _():
    rpc, _, _ = order_desk()
    assert rpc.handle({"jsonrpc": "2.0", "id": 2, "method": "orders/cancel"})["error"] == {
        "code": -32601, "message": "Method not found: orders/cancel"}
    assert rpc.handle({"jsonrpc": "2.0", "id": 3, "method": "orders/status", "params": ["1042"]})["error"] == {
        "code": -32602, "message": "Invalid params: params must be an object"}


@test("InvalidParams from a handler becomes -32602 with its message")
def _():
    rpc, _, _ = order_desk()
    assert rpc.handle({"jsonrpc": "2.0", "id": 4, "method": "orders/status", "params": {}})["error"] == {
        "code": -32602, "message": "Invalid params: order_id is required"}


@test("A crash is -32603 with nothing leaked, and it's logged with the method")
def _():
    rpc, _, _ = order_desk()
    with captured_logs("kiln_mcp") as logs:
        reply = rpc.handle({"jsonrpc": "2.0", "id": 5, "method": "orders/status", "params": {"order_id": "0000"}})
    assert reply == {"jsonrpc": "2.0", "id": 5, "error": {"code": -32603, "message": "Internal error"}}
    assert logs.levels == ["ERROR"]
    assert "orders/status" in logs.messages[0]
    assert logs[0].exc_info is not None, "Use logger.exception so the traceback is in the log"


@hidden("Invalid requests are -32600, with the id when it can be read")
def _():
    rpc, _, _ = order_desk()
    invalid = {"code": -32600, "message": "Invalid request"}
    assert rpc.handle({"jsonrpc": "1.0", "id": 6, "method": "ping"}) == {"jsonrpc": "2.0", "id": 6, "error": invalid}
    assert rpc.handle({"jsonrpc": "2.0", "id": "r7", "method": ""}) == {"jsonrpc": "2.0", "id": "r7", "error": invalid}
    assert rpc.handle({"jsonrpc": "2.0", "id": True, "method": 12}) == {"jsonrpc": "2.0", "id": None, "error": invalid}
    assert rpc.handle(["ping"]) == {"jsonrpc": "2.0", "id": None, "error": invalid}


@hidden("Notifications never get a reply, even unknown or failing ones")
def _():
    rpc, _, _ = order_desk()
    with captured_logs("kiln_mcp") as logs:
        assert rpc.handle({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 9}}) is None
        assert rpc.handle({"jsonrpc": "2.0", "method": "notifications/progress"}) is None
        assert rpc.handle({"jsonrpc": "2.0", "method": "ping"}) is None
    assert logs.levels == ["ERROR"]


@hidden("Id 0 is a request, and missing params are passed as {}")
def _():
    rpc, _, _ = order_desk()
    assert rpc.handle({"jsonrpc": "2.0", "id": 0, "method": "orders/status"})["error"]["code"] == -32602
    assert rpc.handle({"jsonrpc": "2.0", "id": 0, "method": "ping"}) == {"jsonrpc": "2.0", "id": 0, "result": {}}
