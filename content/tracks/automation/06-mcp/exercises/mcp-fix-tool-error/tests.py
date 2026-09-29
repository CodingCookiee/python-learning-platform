import json

from plp import captured_logs, hidden, test
from plp_fakes import McpHarness
from solution import handle


def connected():
    client = McpHarness(handle)
    client.initialize()
    return client


@test("A missing order is a tool result with isError, not a protocol error")
def _():
    assert connected().call_tool("get_order", {"order_id": "9999"}) == {
        "content": [{"type": "text", "text": "Order 9999 not found"}], "isError": True}


@test("Arguments the tool can't take are a tool error too")
def _():
    assert connected().call_tool("get_order", {"order": "1042"}) == {
        "content": [{"type": "text", "text": "Invalid arguments for get_order"}], "isError": True}


@test("An unexpected failure says only that the tool failed, and is logged")
def _():
    with captured_logs("kiln_orders") as logs:
        outcome = connected().call_tool("track_parcel", {"parcel": "DPD-88213"})
    assert outcome == {"content": [{"type": "text", "text": "track_parcel failed"}], "isError": True}
    assert logs.levels == ["ERROR"]
    assert "track_parcel" in logs.messages[0]


@test("Unknown tools are still a -32602 protocol error")
def _():
    reply = connected().request("tools/call", {"name": "refund_order", "arguments": {"order_id": "1042"}})
    assert reply["error"] == {"code": -32602, "message": "Unknown tool: refund_order"}


@hidden("Successful calls are unchanged")
def _():
    outcome = connected().call_tool("get_order", {"order_id": "1042"})
    assert outcome["isError"] is False
    assert json.loads(outcome["content"][0]["text"])["carrier"] == "DPD"


@hidden("The carrier's internal address never reaches the client")
def _():
    client = connected()
    client.call_tool("track_parcel", {"parcel": "DPD-88213"})
    assert "10.2.0.7" not in json.dumps(client.log[-1][1])
