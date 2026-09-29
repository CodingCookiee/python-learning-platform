import json

from plp_fakes import McpHarness

from orders_server import handle


def test_the_handshake_completes():
    client = McpHarness(handle)
    assert client.initialize()["serverInfo"]["name"] == "kiln-orders"


# Test tools/list, a found order, a missing order, a badly formed number and an unknown tool
