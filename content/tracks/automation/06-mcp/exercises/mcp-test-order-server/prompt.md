Here is Kiln & Co's order server, as a pure dispatch function:

```python
# orders_server.py
import json
import re

ORDERS = {
    "1042": {"order_id": "1042", "status": "shipped", "carrier": "DPD"},
    "1043": {"order_id": "1043", "status": "packing", "carrier": None},
}
TOOLS = [{"name": "get_order", "description": "Look up one order by its four-digit number.",
          "inputSchema": {"type": "object", "properties": {"order_id": {"type": "string", "pattern": "^\\d{4}$"}},
                          "required": ["order_id"], "additionalProperties": False}}]


class OrderNotFound(Exception):
    pass


def text_result(text, is_error=False):
    return {"content": [{"type": "text", "text": text}], "isError": is_error}


def call_tool(params):
    order_id = (params.get("arguments") or {}).get("order_id")
    if not isinstance(order_id, str) or not re.fullmatch(r"\d{4}", order_id):
        return text_result("Invalid arguments: order_id must be four digits", is_error=True)
    if order_id not in ORDERS:
        raise OrderNotFound(f"Order {order_id} not found")
    return text_result(json.dumps(ORDERS[order_id]))


def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    if method == "initialize":
        reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                           "serverInfo": {"name": "kiln-orders", "version": "1.3.0"}}
    elif method == "tools/list":
        reply["result"] = {"tools": TOOLS}
    elif method == "tools/call" and params.get("name") == "get_order":
        try:
            reply["result"] = call_tool(params)
        except OrderNotFound as missing:
            reply["result"] = text_result(str(missing), is_error=True)
    elif method == "tools/call":
        reply["error"] = {"code": -32602, "message": f"Unknown tool: {params.get('name')}"}
    else:
        reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    return reply
```

Write `test_orders_server.py`: pytest tests that drive `handle` through `McpHarness` (from
`plp_fakes`) the way a client would. Your tests must pass on this code, and catch the protocol bugs
planted in copies of it: replies that go astray, failures reported as the wrong kind of error, and
arguments that skip validation.
