import json

from plp import hidden, test
from plp_fakes import McpHarness
import solution
from solution import handle


def connected():
    return McpHarness(handle, protocol="2026-07-28")


@test("Lists both tools, and a bad order number is refused with the schema's reason")
def _():
    client = connected()
    assert [tool["name"] for tool in client.list_tools()] == ["get_order", "find_orders"]
    assert client.call_tool("get_order", {"order_id": "10423"})["content"][0]["text"] == (
        "Invalid arguments: order_id: String should match pattern '^\\d{4}$'"
    )


@test("Each definition has the docstring, the input schema without its title, and a read-only hint")
def _():
    get_order = connected().list_tools()[0]
    assert get_order["description"] == "Look up one order by its four-digit number. Returns its status and carrier."
    assert get_order["annotations"] == {"readOnlyHint": True}
    schema = get_order["inputSchema"]
    assert "title" not in schema and "description" not in schema
    assert schema["type"] == "object"
    assert schema["required"] == ["order_id"]
    assert schema["properties"]["order_id"]["description"] == "Four-digit order number, e.g. 1042"
    assert schema["additionalProperties"] is False


@test("A valid call returns the order as JSON")
def _():
    outcome = connected().call_tool("get_order", {"order_id": "1042"})
    assert outcome["isError"] is False
    assert json.loads(outcome["content"][0]["text"]) == solution.ORDERS["1042"]


@test("A missing order is an isError result with the tool's message")
def _():
    assert connected().call_tool("get_order", {"order_id": "9999"}) == {
        "resultType": "complete", "content": [{"type": "text", "text": "Order 9999 not found"}], "isError": True}


@test("Unknown tools are a -32602 protocol error")
def _():
    reply = connected().request("tools/call", {"name": "cancel_order", "arguments": {"order_id": "1042"}})
    assert reply["error"] == {"code": -32602, "message": "Unknown tool: cancel_order"}


@hidden("Every problem is reported, joined with '; ', and the tool doesn't run")
def _():
    ran = []
    original = solution.TOOLS["find_orders"]
    solution.TOOLS["find_orders"] = (original[0], lambda args: ran.append(args) or {"order_ids": []})
    try:
        text = connected().call_tool("find_orders", {"email": "a", "limit": 50, "status": "open"})["content"][0]["text"]
    finally:
        solution.TOOLS["find_orders"] = original
    assert ran == []
    assert text == ("Invalid arguments: email: String should have at least 3 characters; "
                    "limit: Input should be less than or equal to 20; status: Extra inputs are not permitted")


@hidden("Missing arguments are validated as {}, and defaults apply to valid ones")
def _():
    client = connected()
    assert client.call_tool("get_order")["content"][0]["text"] == "Invalid arguments: order_id: Field required"
    assert json.loads(client.call_tool("find_orders", {"email": "Ada@example.com"})["content"][0]["text"]) == {
        "order_ids": ["1047", "1042"]}
    assert json.loads(client.call_tool("find_orders", {"email": "ada@example.com", "limit": 1})["content"][0]["text"]) == {
        "order_ids": ["1047"]}
