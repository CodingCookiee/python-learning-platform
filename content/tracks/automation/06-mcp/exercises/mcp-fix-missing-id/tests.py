from plp import hidden, test
from plp_fakes import McpHarness
from solution import handle

SERVER_INFO_KEY = "io.modelcontextprotocol/serverInfo"


def client():
    return McpHarness(handle, protocol="2026-07-28")


@test("Discovery answers with its id, and so does tools/list")
def _():
    c = client()
    assert c.discover()["_meta"][SERVER_INFO_KEY] == {"name": "kiln-orders", "version": "1.0.0"}
    assert c.request("tools/list")["result"] == {"resultType": "complete", "tools": []}


@test("String ids are echoed exactly")
def _():
    assert client().request("tools/list", id="desk-17")["id"] == "desk-17"


@test("Id 0 is echoed too")
def _():
    assert client().request("tools/list", id=0) == {"jsonrpc": "2.0", "id": 0, "result": {"resultType": "complete", "tools": []}}


@hidden("Errors and notifications work as before")
def _():
    assert client().request("tools/call", {"name": "get_order"}, id=9)["error"] == {
        "code": -32601, "message": "Method not found: tools/call"}
    assert handle({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 3}}) is None


@hidden("The discovery result is unchanged")
def _():
    assert client().discover() == {
        "resultType": "complete", "supportedVersions": ["2026-07-28"], "capabilities": {"tools": {}},
        "_meta": {SERVER_INFO_KEY: {"name": "kiln-orders", "version": "1.0.0"}}}
