import io
import json

from plp import captured_logs, hidden, test
from solution import serve


def handle(message):
    """A tiny order-desk server for the loop to carry."""
    if "id" not in message:
        if message.get("method") == "notifications/boom":
            raise RuntimeError("notification handler crashed")
        return None
    if message.get("method") == "ping":
        return {"jsonrpc": "2.0", "id": message["id"], "result": {}}
    if message.get("method") == "orders/crash":
        raise KeyError("orders_2026")
    return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": -32601, "message": "Method not found"}}


def lines_out(*lines):
    stdout = io.StringIO()
    serve(handle, io.StringIO("".join(line + "\n" for line in lines)), stdout)
    return stdout.getvalue().splitlines()


PING = '{"jsonrpc": "2.0", "id": 1, "method": "ping"}'
PARSE_ERROR = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}


@test("Answers the ping, then reports the line that isn't JSON")
def _():
    assert lines_out(PING, "this is not json") == [
        '{"jsonrpc": "2.0", "id": 1, "result": {}}',
        '{"jsonrpc": "2.0", "id": null, "error": {"code": -32700, "message": "Parse error"}}',
    ]


@test("Notifications and blank lines produce no output")
def _():
    assert lines_out("", '{"jsonrpc": "2.0", "method": "notifications/initialized"}', "   ", PING) == [
        '{"jsonrpc": "2.0", "id": 1, "result": {}}']


@test("Batches and non-objects are invalid requests")
def _():
    replies = [json.loads(line) for line in lines_out(f"[{PING}]", "42", '"ping"')]
    assert replies == [
        {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid request: batches are not supported"}},
        {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid request"}},
        {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid request"}},
    ]


@test("A crashing handler is -32603 for a request, silent for a notification, and logged")
def _():
    with captured_logs("kiln_mcp.stdio") as logs:
        out = lines_out('{"jsonrpc": "2.0", "id": 7, "method": "orders/crash"}',
                        '{"jsonrpc": "2.0", "method": "notifications/boom"}', PING)
    assert [json.loads(line) for line in out] == [
        {"jsonrpc": "2.0", "id": 7, "error": {"code": -32603, "message": "Internal error"}},
        {"jsonrpc": "2.0", "id": 1, "result": {}},
    ]
    assert logs.levels == ["ERROR", "ERROR"]
    assert "orders_2026" not in "".join(out)


class Pipe:
    """A stdin that hands out one line at a time and checks the reply to the previous one was flushed."""

    def __init__(self, lines, stdout):
        self.lines, self.stdout, self.given = list(lines), stdout, 0

    def __iter__(self):
        return self

    def __next__(self):
        line = self.readline()
        if line == "":
            raise StopIteration
        return line

    def readline(self):
        if self.given and self.stdout.flushed < self.given:
            raise AssertionError(f"Asked for line {self.given + 1} before the reply to line {self.given} was flushed")
        if not self.lines:
            return ""
        self.given += 1
        return self.lines.pop(0) + "\n"

    def read(self, *args):
        raise AssertionError("stdin.read() waits for the client to close the pipe, but a client waits for each reply first")

    readlines = read


class Stdout(io.StringIO):
    flushed = 0

    def flush(self):
        self.flushed = self.getvalue().count("\n")
        super().flush()


@hidden("Each reply is written and flushed before the next line is read")
def _():
    stdout = Stdout()
    serve(handle, Pipe([PING, '{"jsonrpc": "2.0", "id": 2, "method": "ping"}', "not json"], stdout), stdout)
    assert [json.loads(line)["id"] for line in stdout.getvalue().splitlines()] == [1, 2, None]


@hidden("Replies are one line each, even when the data contains newlines")
def _():
    def wiki(message):
        return {"jsonrpc": "2.0", "id": message["id"], "result": {"text": "# Returns\n\n30 days."}}
    stdout = io.StringIO()
    serve(wiki, io.StringIO('{"jsonrpc": "2.0", "id": "r1", "method": "resources/read"}\n'), stdout)
    assert stdout.getvalue().count("\n") == 1
    assert json.loads(stdout.getvalue())["result"]["text"] == "# Returns\n\n30 days."
