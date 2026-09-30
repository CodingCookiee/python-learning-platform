import inspect
import json

from pydantic import BaseModel, ConfigDict, Field, ValidationError

ORDERS = {
    "1042": {"order_id": "1042", "email": "ada@example.com", "status": "shipped", "carrier": "DPD"},
    "1043": {"order_id": "1043", "email": "grace@example.com", "status": "packing", "carrier": None},
    "1047": {"order_id": "1047", "email": "ada@example.com", "status": "delivered", "carrier": "Royal Mail"},
}


class GetOrder(BaseModel):
    """Look up one order by its four-digit number. Returns its status and carrier."""

    model_config = ConfigDict(extra="forbid")
    order_id: str = Field(pattern=r"^\d{4}$", description="Four-digit order number, e.g. 1042")


class FindOrders(BaseModel):
    """List the order numbers placed with an email address, newest first."""

    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=3, description="The customer's email address")
    limit: int = Field(default=5, ge=1, le=20)


def get_order(args: GetOrder):
    if args.order_id not in ORDERS:
        raise LookupError(f"Order {args.order_id} not found")
    return ORDERS[args.order_id]


def find_orders(args: FindOrders):
    ids = [o["order_id"] for o in ORDERS.values() if o["email"] == args.email.lower()]
    return {"order_ids": sorted(ids, reverse=True)[: args.limit]}


TOOLS = {"get_order": (GetOrder, get_order), "find_orders": (FindOrders, find_orders)}


class UnknownTool(Exception):
    pass


def text_result(value, *, is_error=False):
    text = value if isinstance(value, str) else json.dumps(value, default=str)
    return {"content": [{"type": "text", "text": text}], "isError": is_error}


def list_tools() -> dict:
    """The tools/list result."""
    ...


def call_tool(params: dict) -> dict:
    """The tools/call result. Raises UnknownTool for a name that isn't in TOOLS."""
    ...


def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    if method == "server/discover":
        reply["result"] = {"supportedVersions": ["2026-07-28"], "capabilities": {"tools": {}},
                           "_meta": {"io.modelcontextprotocol/serverInfo": {"name": "kiln-orders", "version": "1.2.0"}}}
    elif method == "tools/list":
        reply["result"] = list_tools()
    elif method == "tools/call":
        try:
            reply["result"] = call_tool(params)
        except UnknownTool as unknown:
            reply["error"] = {"code": -32602, "message": f"Unknown tool: {unknown}"}
    else:
        reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    if "result" in reply:
        reply["result"] = {"resultType": "complete", **reply["result"]}
    return reply
