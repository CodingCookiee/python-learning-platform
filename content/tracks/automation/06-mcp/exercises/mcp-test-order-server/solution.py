import json

import pytest
from plp_fakes import McpHarness

from orders_server import handle


@pytest.fixture
def client():
    client = McpHarness(handle)
    client.initialize()
    return client


def test_the_handshake_completes():
    client = McpHarness(handle)
    assert client.initialize()["serverInfo"]["name"] == "kiln-orders"


def test_lists_get_order(client):
    assert [tool["name"] for tool in client.list_tools()] == ["get_order"]


def test_a_found_order_is_returned_as_json(client):
    result = client.call_tool("get_order", {"order_id": "1042"})
    assert result["isError"] is False
    assert json.loads(result["content"][0]["text"])["status"] == "shipped"


def test_a_missing_order_is_a_tool_error(client):
    result = client.call_tool("get_order", {"order_id": "9999"})
    assert result == {"content": [{"type": "text", "text": "Order 9999 not found"}], "isError": True}


def test_a_badly_formed_number_is_refused_before_lookup(client):
    result = client.call_tool("get_order", {"order_id": "10423"})
    assert result["isError"] is True
    assert result["content"][0]["text"] == "Invalid arguments: order_id must be four digits"


def test_an_unknown_tool_is_a_protocol_error(client):
    reply = client.request("tools/call", {"name": "refund_order", "arguments": {"order_id": "1042"}})
    assert reply["error"]["code"] == -32602
