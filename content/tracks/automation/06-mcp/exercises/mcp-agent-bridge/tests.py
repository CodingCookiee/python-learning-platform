import json

from plp import hidden, raises, test
from plp_fakes import McpHarness, Reply, ScriptedLLM, tool_call
from solution import McpToolbox, StepLimitExceeded, run_agent

ORDERS = {"1042": {"order_id": "1042", "status": "shipped", "carrier": "DPD"}}
PAGES = {"returns": "Unused items can be returned within 30 days.", "shipping": "Orders ship within two working days."}


def server(name, tools, call):
    """A small MCP server: initialize, tools/list, and tools/call through call(tool, arguments)."""
    def handle(message):
        if "id" not in message:
            return None
        reply = {"jsonrpc": "2.0", "id": message["id"]}
        method, params = message["method"], message.get("params") or {}
        if method == "initialize":
            reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                               "serverInfo": {"name": name, "version": "1.0.0"}}
        elif method == "tools/list":
            reply["result"] = {"tools": tools}
        elif method == "tools/call" and params.get("name") in {t["name"] for t in tools}:
            reply["result"] = call(params["name"], params.get("arguments") or {})
        elif method == "tools/call":
            reply["error"] = {"code": -32602, "message": f"Unknown tool: {params.get('name')}"}
        else:
            reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
        return reply
    client = McpHarness(handle)
    client.initialize()
    return client


def text(value, is_error=False):
    return {"content": [{"type": "text", "text": value}], "isError": is_error}


def orders_call(tool, arguments):
    order = ORDERS.get(arguments.get("order_id"))
    return text(json.dumps(order)) if order else text(f"Order {arguments.get('order_id')} not found", True)


def wiki_call(tool, arguments):
    hits = [page for key, page in PAGES.items() if key in arguments.get("query", "")]
    return {"content": [{"type": "text", "text": hit} for hit in hits], "isError": False}


ORDER_TOOLS = [{"name": "get_order", "description": "Look up an order by number.",
                "inputSchema": {"type": "object", "properties": {"order_id": {"type": "string"}}}}]
WIKI_TOOLS = [{"name": "search_docs", "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}}}}]


def servers():
    orders = server("kiln-orders", ORDER_TOOLS, orders_call)
    wiki = server("kiln-wiki", WIKI_TOOLS, wiki_call)
    return orders, wiki, [McpToolbox("orders", orders), McpToolbox("wiki", wiki)]


@test("Answers the example through the order server")
def _():
    orders, wiki, boxes = servers()
    llm = ScriptedLLM([tool_call("orders__get_order", order_id="1042"), "Order 1042 shipped with DPD."])
    assert run_agent(llm, "Where is order 1042?", boxes) == "Order 1042 shipped with DPD."
    assert llm.calls[1]["messages"][-1]["content"] == '{"order_id": "1042", "status": "shipped", "carrier": "DPD"}'


@test("Offers both servers' tools as prefixed neutral tools")
def _():
    _, _, boxes = servers()
    llm = ScriptedLLM(["How can I help?"])
    run_agent(llm, "Hello", boxes)
    assert llm.calls[0]["messages"] == [{"role": "user", "content": "Hello"}]
    assert llm.calls[0]["tools"] == [
        {"name": "orders__get_order", "description": "Look up an order by number.", "parameters": ORDER_TOOLS[0]["inputSchema"]},
        {"name": "wiki__search_docs", "description": "", "parameters": WIKI_TOOLS[0]["inputSchema"]},
    ]


@test("Routes parallel calls to the right servers, one result per call in order")
def _():
    orders, wiki, boxes = servers()
    first, second = tool_call("wiki__search_docs", query="returns"), tool_call("orders__get_order", order_id="9999")
    llm = ScriptedLLM([Reply(tool_calls=[first, second]), "Returns take 30 days; I can't find order 9999."])
    run_agent(llm, "Can I return order 9999?", boxes)
    history = llm.calls[1]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant", "tool", "tool"]
    assert [m["tool_call_id"] for m in history[2:]] == [first.id, second.id]
    assert history[2]["content"] == "Unused items can be returned within 30 days."
    assert json.loads(history[3]["content"]) == {"error": "Order 9999 not found"}
    assert [m["params"]["name"] for m, _ in wiki.log if m.get("method") == "tools/call"] == ["search_docs"]


@test("A name no toolbox owns, and a tool the server doesn't have, are error results")
def _():
    _, _, boxes = servers()
    llm = ScriptedLLM([[tool_call("crm__find_contact", email="ada@example.com"), tool_call("orders__refund", order_id="1042")],
                       "I can't do that."])
    run_agent(llm, "Refund Ada", boxes)
    results = [json.loads(m["content"]) for m in llm.calls[1]["messages"][2:]]
    assert results == [{"error": "Unknown tool: crm__find_contact"}, {"error": "Unknown tool: refund"}]


@hidden("Tools are listed once per run, not once per step")
def _():
    orders, wiki, boxes = servers()
    llm = ScriptedLLM([tool_call("orders__get_order", order_id="1042"), tool_call("wiki__search_docs", query="shipping"),
                       "Shipped; orders ship within two working days."])
    run_agent(llm, "When will 1042 arrive?", boxes)
    for client in (orders, wiki):
        assert [m.get("method") for m, _ in client.log].count("tools/list") == 1
    assert llm.calls[2]["tools"] == llm.calls[0]["tools"]


@hidden("Several text blocks from one call are joined")
def _():
    _, _, boxes = servers()
    llm = ScriptedLLM([tool_call("wiki__search_docs", query="returns and shipping"), "Here's what the wiki says."])
    run_agent(llm, "Policies?", boxes)
    assert llm.calls[1]["messages"][-1]["content"] == (
        "Unused items can be returned within 30 days.\nOrders ship within two working days.")


@hidden("Stops at max_steps")
def _():
    _, _, boxes = servers()
    llm = ScriptedLLM([tool_call("orders__get_order", order_id="1042")] * 3)
    raises(StepLimitExceeded, run_agent, llm, "Loop", boxes, max_steps=3)
    assert len(llm.calls) == 3
