import contextlib
import io
import json

from plp import captured_logs, hidden, test
from solution import handle, serve

META = {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {},
        "io.modelcontextprotocol/clientInfo": {"name": "claude-desktop", "version": "1.9"}}
DISCOVER = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "server/discover", "params": {"_meta": META}})
CANCELLED = json.dumps({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 1}})
READ_RETURNS = json.dumps({"jsonrpc": "2.0", "id": 2, "method": "resources/read", "params": {"uri": "policy://returns"}})
READ_SHIPPING = json.dumps({"jsonrpc": "2.0", "id": 3, "method": "resources/read", "params": {"uri": "policy://shipping"}})


def run(*lines):
    """What serve writes to the real stdout for these input lines."""
    with contextlib.redirect_stdout(io.StringIO()) as out:
        serve(handle, stdin=io.StringIO("\n".join(lines) + "\n"))
    return out.getvalue()


def not_json(output):
    bad = []
    for line in output.splitlines():
        try:
            json.loads(line)
        except ValueError:
            bad.append(line)
    return bad


@test("Stdout holds only the two replies, in order")
def _():
    output = run(DISCOVER, READ_RETURNS)
    assert not_json(output) == [], "Every line on stdout must be a JSON-RPC message"
    assert [json.loads(line)["id"] for line in output.splitlines()] == [1, 2]


@test("The ready message and each read are logged at INFO instead")
def _():
    with captured_logs("kiln_wiki") as logs:
        run(DISCOVER, CANCELLED, READ_RETURNS, READ_SHIPPING)
    assert logs.messages == ["kiln-wiki MCP server ready", "reading policy://returns", "reading policy://shipping"]
    assert set(logs.levels) == {"INFO"}


@test("The replies themselves are unchanged")
def _():
    output = run(DISCOVER, CANCELLED, READ_RETURNS)
    replies = [json.loads(line) for line in output.splitlines() if line.startswith("{")]
    assert replies[1] == {"jsonrpc": "2.0", "id": 2, "result": {"resultType": "complete", "contents": [{
        "uri": "policy://returns", "mimeType": "text/markdown",
        "text": "# Returns\n\nUnused items can be returned within 30 days of delivery."}]}}


@hidden("Nothing is printed while handling messages directly either")
def _():
    with contextlib.redirect_stdout(io.StringIO()) as out:
        handle(json.loads(READ_SHIPPING))
    assert out.getvalue() == ""
