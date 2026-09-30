from plp import hidden, test
from plp_fakes import McpHarness
from solution import AppointmentServer

INFO = {"name": "leith-physio-appointments", "version": "2.1.0"}
MISSING_META = "Invalid params: _meta needs protocolVersion and clientCapabilities"


@test("An older client completes the handshake and lists tools; a modern one still discovers")
def _():
    old = McpHarness(AppointmentServer().handle)
    assert old.initialize()["protocolVersion"] == "2025-06-18"
    assert [tool["name"] for tool in old.list_tools()] == ["find_slots"]
    assert McpHarness(AppointmentServer().handle, protocol="2026-07-28").discover()["supportedVersions"] == ["2026-07-28"]


@test("The initialize result has the capabilities, server info and instructions")
def _():
    result = McpHarness(AppointmentServer().handle).initialize("2025-11-25")
    assert result["protocolVersion"] == "2025-11-25"
    assert result["capabilities"] == {"tools": {}}
    assert result["serverInfo"] == INFO
    assert result["instructions"].startswith("Find and describe appointment slots")


@test("A version older or newer than the list gets the newest legacy version, stored on the server")
def _():
    server = AppointmentServer()
    assert McpHarness(server.handle).initialize("2024-11-05")["protocolVersion"] == "2025-11-25"
    assert server.legacy_version == "2025-11-25"
    assert McpHarness(AppointmentServer().handle).initialize("2027-01-01")["protocolVersion"] == "2025-11-25"


@test("Before initialize, a request without _meta is still malformed")
def _():
    old = McpHarness(AppointmentServer().handle)
    assert old.request("tools/list", {})["error"] == {"code": -32602, "message": MISSING_META}


@hidden("A missing or non-string protocolVersion in initialize is -32602")
def _():
    server = AppointmentServer()
    old = McpHarness(server.handle)
    assert old.request("initialize", {"capabilities": {}, "clientInfo": {"name": "t", "version": "1"}})["error"] == {
        "code": -32602, "message": "Invalid params: protocolVersion is required"}
    assert old.request("initialize", {"protocolVersion": 20250618})["error"]["code"] == -32602
    assert server.legacy_version is None


@hidden("Modern requests are still checked after an initialize on the same connection")
def _():
    server = AppointmentServer()
    McpHarness(server.handle).initialize()
    assert McpHarness(server.handle, protocol="2026-07-28").request("tools/list")["result"]["tools"][0]["name"] == "find_slots"
    assert McpHarness(server.handle, protocol="2027-03-01").request("tools/list")["error"]["code"] == -32022


@hidden("Legacy requests get -32601 for unknown methods, and notifications are never answered")
def _():
    server = AppointmentServer()
    old = McpHarness(server.handle)
    old.initialize()
    assert old.request("prompts/list")["error"] == {"code": -32601, "message": "Method not found: prompts/list"}
    assert server.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}) is None
    assert server.handle({"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2025-06-18"}}) is None
