from plp import captured_logs, hidden, test
from plp_fakes import McpHarness
from solution import Dispatcher, InvalidParams

META = "io.modelcontextprotocol/"
ORDERS = {"1042": {"status": "shipped"}}


def order_desk():
    """A small server built on the learner's Dispatcher, plus a record of what ran."""
    rpc = Dispatcher()
    seen = []

    @rpc.method("server/discover")
    def discover(params):
        return {"supportedVersions": ["2026-07-28"], "capabilities": {"tools": {}},
                "_meta": {META + "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}}

    @rpc.method("tools/list")
    def list_tools(params):
        return {"tools": []}

    @rpc.method("tasks/get")
    def task(params):
        return {"resultType": "input_required", "inputRequests": {}}

    @rpc.method("orders/status")
    def status(params):
        if "order_id" not in params:
            raise InvalidParams("order_id is required")
        if params["order_id"] == "0000":
            raise RuntimeError("connection to db-eu-2.internal:5432 refused")
        return ORDERS[params["order_id"]]

    @rpc.notification("notifications/cancelled")
    def cancelled(params):
        seen.append(params["requestId"])

    @rpc.notification("notifications/progress")
    def progress(params):
        raise KeyError(params["token"])

    return rpc, seen, list_tools


def modern(rpc):
    return McpHarness(rpc.handle, protocol="2026-07-28")


@test("Answers tools/list with a resultType, and the decorators return the function unchanged")
def _():
    rpc, seen, list_tools = order_desk()
    assert rpc.handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}) == {
        "jsonrpc": "2.0", "id": 1, "result": {"resultType": "complete", "tools": []}}
    assert list_tools({}) == {"tools": []}


@test("Discovery through the harness, and a notification handled")
def _():
    rpc, seen, _ = order_desk()
    client = modern(rpc)
    assert client.discover()["supportedVersions"] == ["2026-07-28"]
    client.notify("notifications/cancelled", {"requestId": 7})
    assert seen == [7]
    assert client.request("orders/status", {"order_id": "1042"})["result"] == {"resultType": "complete", "status": "shipped"}


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
    assert rpc.handle({"jsonrpc": "1.0", "id": 6, "method": "tools/list"}) == {"jsonrpc": "2.0", "id": 6, "error": invalid}
    assert rpc.handle({"jsonrpc": "2.0", "id": "r7", "method": ""}) == {"jsonrpc": "2.0", "id": "r7", "error": invalid}
    assert rpc.handle({"jsonrpc": "2.0", "id": True, "method": 12}) == {"jsonrpc": "2.0", "id": None, "error": invalid}
    assert rpc.handle(["tools/list"]) == {"jsonrpc": "2.0", "id": None, "error": invalid}


@hidden("Notifications never get a reply, even unknown or failing ones")
def _():
    rpc, _, _ = order_desk()
    with captured_logs("kiln_mcp") as logs:
        assert rpc.handle({"jsonrpc": "2.0", "method": "notifications/progress", "params": {"progress": 1}}) is None
        assert rpc.handle({"jsonrpc": "2.0", "method": "notifications/roots/list_changed"}) is None
        assert rpc.handle({"jsonrpc": "2.0", "method": "tools/list"}) is None
    assert logs.levels == ["ERROR"]


@hidden("Id 0 is a request, missing params are {}, and a handler's own resultType is kept")
def _():
    rpc, _, _ = order_desk()
    assert rpc.handle({"jsonrpc": "2.0", "id": 0, "method": "orders/status"})["error"]["code"] == -32602
    assert rpc.handle({"jsonrpc": "2.0", "id": 0, "method": "tools/list"})["result"] == {"resultType": "complete", "tools": []}
    assert rpc.handle({"jsonrpc": "2.0", "id": 8, "method": "tasks/get"})["result"]["resultType"] == "input_required"
