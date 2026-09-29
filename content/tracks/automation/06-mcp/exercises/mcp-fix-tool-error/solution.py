import json
import logging

logger = logging.getLogger("kiln_orders")

ORDERS = {"1042": {"order_id": "1042", "status": "shipped", "carrier": "DPD", "parcel": "DPD-88213"}}


class ToolError(Exception):
    """A failure the model should hear about, in words it can act on."""


class OrderNotFound(ToolError):
    pass


def get_order(order_id):
    if order_id not in ORDERS:
        raise OrderNotFound(f"Order {order_id} not found")
    return ORDERS[order_id]


def track_parcel(parcel):
    raise ConnectionError("carrier API at 10.2.0.7:8443 timed out after 10s")


TOOLS = {"get_order": get_order, "track_parcel": track_parcel}


def result(request_id, value):
    return {"jsonrpc": "2.0", "id": request_id, "result": value}


def error(request_id, code, message):
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def text_block(text):
    return {"type": "text", "text": text}


def tool_failure(text):
    return {"content": [text_block(text)], "isError": True}


def call_tool(request_id, params):
    name = params.get("name")
    tool = TOOLS.get(name)
    if tool is None:
        return error(request_id, -32602, f"Unknown tool: {name}")
    try:
        value = tool(**params.get("arguments", {}))
    except ToolError as problem:
        return result(request_id, tool_failure(str(problem)))
    except TypeError:
        return result(request_id, tool_failure(f"Invalid arguments for {name}"))
    except Exception:
        logger.exception("Tool %s failed", name)
        return result(request_id, tool_failure(f"{name} failed"))
    return result(request_id, {"content": [text_block(json.dumps(value))], "isError": False})


def handle(message):
    if "id" not in message:
        return None
    method, params = message["method"], message.get("params", {})
    if method == "initialize":
        return result(message["id"], {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                                      "serverInfo": {"name": "kiln-orders", "version": "1.1.0"}})
    if method == "tools/call":
        return call_tool(message["id"], params)
    return error(message["id"], -32601, f"Method not found: {method}")
