import json

ORDERS = {"1042": {"status": "shipped"}}


def get_order(arguments):
    order_id = arguments["order_id"]
    if order_id not in ORDERS:
        raise LookupError(f"Order {order_id} not found")
    return ORDERS[order_id]


TOOLS = {"get_order": get_order}


def text(value, is_error):
    return {"result": {"content": [{"type": "text", "text": value}], "isError": is_error}}


def call_tool(params):
    name = params.get("name")
    if name not in TOOLS:
        return {"error": {"code": -32602, "message": f"Unknown tool: {name}"}}
    try:
        value = TOOLS[name](params.get("arguments", {}))
    except KeyError as missing:
        return text(f"Missing argument: {missing}", True)
    except LookupError as problem:
        return text(str(problem), True)
    return text(json.dumps(value), False)


calls = [
    {"name": "get_order", "arguments": {"order_id": "1042"}},
    {"name": "get_order", "arguments": {"order_id": "9999"}},
    {"name": "get_order", "arguments": {}},
    {"name": "cancel_order", "arguments": {"order_id": "1042"}},
]

for params in calls:
    reply = call_tool(params)
    if "error" in reply:
        print("protocol error", reply["error"]["code"], reply["error"]["message"])
    else:
        result = reply["result"]
        print("isError" if result["isError"] else "ok", result["content"][0]["text"])
