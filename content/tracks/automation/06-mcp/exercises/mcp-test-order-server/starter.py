import json

from plp_fakes import McpHarness

from orders_server import handle


def test_discovery_names_the_server():
    client = McpHarness(handle, protocol="2026-07-28")
    assert client.discover()["_meta"]["io.modelcontextprotocol/serverInfo"]["name"] == "kiln-orders"


# Test tools/list, a found order, a missing order, a badly formed number and an unknown tool
