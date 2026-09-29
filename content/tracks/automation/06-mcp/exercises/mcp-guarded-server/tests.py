import json

from plp import hidden, test
from plp_fakes import McpHarness
from solution import guard

TOOLS = [{"name": n, "inputSchema": {"type": "object"}} for n in ["get_order", "cancel_order", "search_docs", "refund_order"]]
calls = []


def handle(message):
    if "id" not in message:
        calls.append(message["method"])
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    if method == "initialize":
        reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                           "serverInfo": {"name": "kiln-orders", "version": "2.1.0"}}
    elif method == "tools/list":
        reply["result"] = {"tools": TOOLS, "nextCursor": "page-2"}
    elif method == "tools/call":
        calls.append((params["name"], params.get("arguments")))
        reply["result"] = {"content": [{"type": "text", "text": json.dumps({"ran": params["name"]})}], "isError": False}
    else:
        reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    return reply


def connect(limit=2, allowed=frozenset({"get_order", "search_docs"})):
    calls.clear()
    now = [0.0]
    client = McpHarness(guard(handle, allowed_tools=set(allowed), calls_per_minute=limit, clock=lambda: now[0]))
    client.initialize()
    return client, now


def text(result):
    return result["content"][0]["text"]


@test("Lists only the allowed tools, and rate-limits the third call in a minute")
def _():
    client, now = connect()
    assert [tool["name"] for tool in client.list_tools()] == ["get_order", "search_docs"]
    assert text(client.call_tool("get_order", {"order_id": "1042"})) == '{"ran": "get_order"}'
    now[0] = 20.0
    assert text(client.call_tool("get_order", {"order_id": "1043"})) == '{"ran": "get_order"}'
    now[0] = 45.5
    assert client.call_tool("get_order", {"order_id": "1044"}) == {
        "content": [{"type": "text", "text": "Rate limit reached: try again in 15 s"}], "isError": True}


@test("A tool that isn't allowed looks like one that doesn't exist, and never runs")
def _():
    client, _ = connect()
    assert client.request("tools/call", {"name": "cancel_order", "arguments": {"order_id": "1042"}})["error"] == {
        "code": -32602, "message": "Unknown tool: cancel_order"}
    assert [c for c in calls if isinstance(c, tuple)] == []


@test("The rest of the tools/list reply is kept")
def _():
    client, _ = connect()
    assert client.request("tools/list")["result"] == {"tools": [TOOLS[0], TOOLS[2]], "nextCursor": "page-2"}
    assert [tool["name"] for tool in TOOLS] == ["get_order", "cancel_order", "search_docs", "refund_order"]


@test("Refused calls don't reach the server, and calls work again once the window moves on")
def _():
    client, now = connect(limit=1)
    client.call_tool("search_docs", {"query": "returns"})
    now[0] = 30.0
    assert client.call_tool("search_docs", {"query": "shipping"})["isError"] is True
    now[0] = 60.0
    assert client.call_tool("search_docs", {"query": "shipping"})["isError"] is False
    assert [c[1]["query"] for c in calls if isinstance(c, tuple)] == ["returns", "shipping"]


@hidden("Refused calls don't count, and the wait is rounded up")
def _():
    client, now = connect(limit=2)
    client.call_tool("get_order", {"order_id": "1042"})
    now[0] = 10.0
    client.call_tool("get_order", {"order_id": "1043"})
    now[0] = 30.0
    assert text(client.call_tool("get_order", {"order_id": "1044"})) == "Rate limit reached: try again in 30 s"
    now[0] = 59.2
    assert text(client.call_tool("get_order", {"order_id": "1044"})) == "Rate limit reached: try again in 1 s"
    now[0] = 60.0
    assert client.call_tool("get_order", {"order_id": "1044"})["isError"] is False
    now[0] = 69.9
    assert text(client.call_tool("get_order", {"order_id": "1045"})) == "Rate limit reached: try again in 1 s"


@hidden("Calls that aren't allowed don't use up the limit")
def _():
    client, _ = connect(limit=1)
    for _attempt in range(3):
        client.request("tools/call", {"name": "refund_order", "arguments": {"order_id": "1042"}})
    assert client.call_tool("get_order", {"order_id": "1042"})["isError"] is False


@hidden("Notifications and other methods pass straight through")
def _():
    client, _ = connect()
    client.notify("notifications/cancelled", {"requestId": 3})
    assert calls[-1] == "notifications/cancelled"
    assert client.request("resources/list")["error"]["code"] == -32601
