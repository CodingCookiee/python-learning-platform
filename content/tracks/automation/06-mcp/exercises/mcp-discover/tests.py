from plp import hidden, test
from plp_fakes import McpHarness
from solution import handle

META = "io.modelcontextprotocol/"
INFO = {"name": "leith-physio-appointments", "version": "2.1.0"}
MISSING = {"code": -32602, "message": "Invalid params: _meta needs protocolVersion and clientCapabilities"}


def modern(protocol="2026-07-28"):
    return McpHarness(handle, protocol=protocol)


@test("Discovery lists the supported versions, and a future version is refused with them")
def _():
    assert modern().discover()["supportedVersions"] == ["2026-07-28"]
    assert modern("2027-03-01").request("tools/list")["error"]["data"] == {
        "supported": ["2026-07-28"], "requested": "2027-03-01"}


@test("The discovery result: capabilities, instructions, server info and resultType")
def _():
    assert modern().discover() == {
        "resultType": "complete",
        "supportedVersions": ["2026-07-28"],
        "capabilities": {"tools": {}},
        "instructions": "Find and describe appointment slots. Booking is done by reception, not by this server.",
        "_meta": {META + "serverInfo": INFO},
    }


@test("tools/list works, with the same resultType and server info")
def _():
    result = modern().request("tools/list")["result"]
    assert [tool["name"] for tool in result["tools"]] == ["find_slots"]
    assert result["resultType"] == "complete"
    assert result["_meta"] == {META + "serverInfo": INFO}


@test("An unsupported version is -32022 on every method, discovery included")
def _():
    old = {"_meta": {META + "protocolVersion": "2025-06-18"}}
    reply = modern().request("server/discover", old)
    assert reply["error"] == {"code": -32022, "message": "Unsupported protocol version",
                              "data": {"supported": ["2026-07-28"], "requested": "2025-06-18"}}


@test("A request without _meta is malformed: -32602")
def _():
    assert modern().send({"jsonrpc": "2.0", "id": 5, "method": "tools/list"}) == {"jsonrpc": "2.0", "id": 5, "error": MISSING}


@hidden("Both required fields are checked, and the version must be a string")
def _():
    no_caps = {"jsonrpc": "2.0", "id": 6, "method": "tools/list", "params": {"_meta": {META + "protocolVersion": "2026-07-28"}}}
    assert modern().send(no_caps)["error"] == MISSING
    numeric = {"_meta": {META + "protocolVersion": 20260728}}
    assert modern().request("tools/list", numeric)["error"] == MISSING
    assert modern().send({"jsonrpc": "2.0", "id": 7, "method": "tools/list", "params": {"_meta": None}})["error"] == MISSING


@hidden("Unknown methods are -32601 once the version is fine, and notifications are never answered")
def _():
    assert modern().request("tools/call", {"name": "book_slot", "arguments": {}})["error"] == {
        "code": -32601, "message": "Method not found: tools/call"}
    assert modern("2027-03-01").request("tools/call")["error"]["code"] == -32022
    assert handle({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 1}}) is None
    assert handle({"jsonrpc": "2.0", "method": "server/discover"}) is None


@hidden("Each request is checked on its own: nothing is remembered between them")
def _():
    client = modern()
    client.discover()
    assert client.send({"jsonrpc": "2.0", "id": "x", "method": "tools/list", "params": {}})["error"] == MISSING
    assert client.request("tools/list", id=0)["result"]["resultType"] == "complete"
