import json
import logging

from plp import captured_logs, hidden, raises, test
from plp_fakes import McpHarness
from solution import audited

ORDERS = {"1042": {"status": "shipped"}}
DOCS = {"policy://returns": "# Returns"}
received = []


def handle(message):
    received.append(message)
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    if method == "initialize":
        reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}, "resources": {}},
                           "serverInfo": {"name": "kiln-orders", "version": "2.0.0"}}
    elif method == "tools/list":
        reply["result"] = {"tools": []}
    elif method == "tools/call" and params["name"] == "explode":
        raise RuntimeError("database connection lost")
    elif method == "tools/call" and params["name"] in {"get_order", "find_customer"}:
        order = ORDERS.get(params["arguments"].get("order_id"))
        reply["result"] = {"content": [{"type": "text", "text": json.dumps(order) if order else "Order not found"}],
                           "isError": order is None}
    elif method == "tools/call":
        reply["error"] = {"code": -32602, "message": f"Unknown tool: {params['name']}"}
    elif method == "resources/read" and params["uri"] in DOCS:
        reply["result"] = {"contents": [{"uri": params["uri"], "mimeType": "text/markdown", "text": DOCS[params["uri"]]}]}
    else:
        reply["error"] = {"code": -32602, "message": "Resource not found"}
    return reply


class Clock:
    """Advances 12 ms every time it's read."""
    def __init__(self):
        self.now = 100.0

    def __call__(self):
        self.now += 0.012
        return self.now


LOGGER = logging.getLogger("kiln_mcp.audit")


def connect():
    client = McpHarness(audited(handle, LOGGER, clock=Clock()))
    client.initialize()
    return client


def entries(logs):
    return [json.loads(message) for message in logs.messages]


@test("Logs the example call with the client, target, arguments, outcome and time")
def _():
    client = connect()
    with captured_logs("kiln_mcp.audit") as logs:
        client.call_tool("get_order", {"order_id": "1042"})
    assert entries(logs) == [{"client": "pylearn-test", "method": "tools/call", "target": "get_order",
                              "arguments": {"order_id": "1042"}, "outcome": "ok", "ms": 12}]
    assert logs.levels == ["INFO"]


@test("Replies pass through unchanged, and only audited methods are logged")
def _():
    with captured_logs("kiln_mcp.audit") as logs:
        client = connect()
        assert client.list_tools() == []
        assert client.call_tool("get_order", {"order_id": "1042"}) == {
            "content": [{"type": "text", "text": '{"status": "shipped"}'}], "isError": False}
    assert [entry["target"] for entry in entries(logs)] == ["get_order"]


@test("Tool errors, protocol errors and resource reads each have their outcome")
def _():
    client = connect()
    with captured_logs("kiln_mcp.audit") as logs:
        client.call_tool("get_order", {"order_id": "9999"})
        client.request("tools/call", {"name": "cancel_order", "arguments": {"order_id": "1042"}})
        client.read_resource("policy://returns")
        client.request("resources/read", {"uri": "policy://refunds"})
    assert [(e["method"], e["target"], e["arguments"], e["outcome"]) for e in entries(logs)] == [
        ("tools/call", "get_order", {"order_id": "9999"}, "tool_error"),
        ("tools/call", "cancel_order", {"order_id": "1042"}, "protocol_error"),
        ("resources/read", "policy://returns", {}, "ok"),
        ("resources/read", "policy://refunds", {}, "protocol_error"),
    ]


@test("Sensitive arguments are redacted in the log, but not in what the server receives")
def _():
    client = connect()
    with captured_logs("kiln_mcp.audit") as logs:
        client.call_tool("find_customer", {"email": "ada@example.com", "order_id": "1042"})
    assert entries(logs)[0]["arguments"] == {"email": "[redacted]", "order_id": "1042"}
    assert "ada@example.com" not in logs.text
    assert received[-1]["params"]["arguments"] == {"email": "ada@example.com", "order_id": "1042"}


@hidden("An exception is logged with outcome exception, then re-raised")
def _():
    client = connect()
    with captured_logs("kiln_mcp.audit") as logs:
        raises(RuntimeError, client.call_tool, "explode", {})
    assert entries(logs)[0]["outcome"] == "exception"
    assert entries(logs)[0]["target"] == "explode"


@hidden("Before initialize the client is unknown, and each wrapper remembers its own client")
def _():
    with captured_logs("kiln_mcp.audit") as logs:
        early = McpHarness(audited(handle, LOGGER, clock=Clock()))
        early.request("tools/call", {"name": "get_order", "arguments": {"order_id": "1042"}})
        early.initialize()
        early.request("tools/call", {"name": "get_order", "arguments": {"order_id": "1042"}})
        fresh = McpHarness(audited(handle, LOGGER, clock=Clock()))
        fresh.request("tools/call", {"name": "get_order", "arguments": {"order_id": "1042"}})
    assert [e["client"] for e in entries(logs)] == ["unknown", "pylearn-test", "unknown"]


@hidden("Notifications are passed on and not logged")
def _():
    client = connect()
    with captured_logs("kiln_mcp.audit") as logs:
        client.notify("notifications/cancelled", {"requestId": 1})
    assert logs.messages == []
    assert received[-1]["method"] == "notifications/cancelled"
