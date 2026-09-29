from plp import hidden, test
from plp_fakes import McpHarness
from solution import handle

INFO = {"name": "leith-physio-appointments", "version": "2.1.0"}


@test("Agrees on a supported version, offers its newest otherwise, and answers ping")
def _():
    client = McpHarness(handle)
    assert client.initialize("2025-06-18")["protocolVersion"] == "2025-06-18"
    assert client.initialize("2024-11-05")["protocolVersion"] == "2025-11-25"
    assert client.request("ping")["result"] == {}


@test("The result has the capabilities, server info and instructions")
def _():
    client = McpHarness(handle)
    assert client.initialize("2025-11-25") == {
        "protocolVersion": "2025-11-25",
        "capabilities": {"tools": {"listChanged": False}},
        "serverInfo": INFO,
        "instructions": "Find and describe appointment slots. Booking is done by reception, not by this server.",
    }


@test("A version from the future gets the server's newest")
def _():
    assert McpHarness(handle).initialize("2027-01-01")["protocolVersion"] == "2025-11-25"


@test("Unknown methods are -32601")
def _():
    client = McpHarness(handle)
    client.initialize()
    assert client.request("tools/call", {"name": "book_slot", "arguments": {}})["error"] == {
        "code": -32601, "message": "Method not found: tools/call"
    }


@hidden("A missing or non-string protocolVersion is -32602")
def _():
    client = McpHarness(handle)
    missing = client.request("initialize", {"capabilities": {}, "clientInfo": {"name": "t", "version": "1"}})
    assert missing["error"] == {"code": -32602, "message": "Invalid params: protocolVersion is required"}
    assert client.request("initialize", {"protocolVersion": 20250618})["error"]["code"] == -32602
    assert client.request("initialize")["error"]["code"] == -32602


@hidden("Notifications are never answered, known or not")
def _():
    assert handle({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None
    assert handle({"jsonrpc": "2.0", "method": "ping"}) is None


@hidden("Every older supported version is accepted as it is")
def _():
    assert McpHarness(handle).initialize("2025-03-26")["protocolVersion"] == "2025-03-26"
    assert handle({"jsonrpc": "2.0", "id": "x-1", "method": "ping"}) == {"jsonrpc": "2.0", "id": "x-1", "result": {}}
