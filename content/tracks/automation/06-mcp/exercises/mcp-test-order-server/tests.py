import re
from functools import cache

import plp
from plp import pytest_run, solution_source, source_uses


# Each check runs pytest, which takes a few seconds (the first run imports it). The per-test
# limit only watches tests.py itself here, so it's switched off; the drill's timeout still applies.
def test(name):
    return plp.test(name, timeout=None)


def hidden(name):
    return plp.hidden(name, timeout=None)


MODULE, TEST_FILE = "orders_server.py", "test_orders_server.py"

CORRECT = '''
import json
import re

ORDERS = {
    "1042": {"order_id": "1042", "status": "shipped", "carrier": "DPD"},
    "1043": {"order_id": "1043", "status": "packing", "carrier": None},
}
TOOLS = [{"name": "get_order", "description": "Look up one order by its four-digit number.",
          "inputSchema": {"type": "object", "properties": {"order_id": {"type": "string", "pattern": "^\\\\d{4}$"}},
                          "required": ["order_id"], "additionalProperties": False}}]


class OrderNotFound(Exception):
    pass


def text_result(text, is_error=False):
    return {"content": [{"type": "text", "text": text}], "isError": is_error}


def call_tool(params):
    order_id = (params.get("arguments") or {}).get("order_id")
    if not isinstance(order_id, str) or not re.fullmatch(r"\\d{4}", order_id):
        return text_result("Invalid arguments: order_id must be four digits", is_error=True)
    if order_id not in ORDERS:
        raise OrderNotFound(f"Order {order_id} not found")
    return text_result(json.dumps(ORDERS[order_id]))


def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    if method == "server/discover":
        reply["result"] = {"supportedVersions": ["2026-07-28"], "capabilities": {"tools": {}},
                           "_meta": {"io.modelcontextprotocol/serverInfo": {"name": "kiln-orders", "version": "1.3.0"}}}
    elif method == "tools/list":
        reply["result"] = {"tools": TOOLS}
    elif method == "tools/call" and params.get("name") == "get_order":
        try:
            reply["result"] = call_tool(params)
        except OrderNotFound as missing:
            reply["result"] = text_result(str(missing), is_error=True)
    elif method == "tools/call":
        reply["error"] = {"code": -32602, "message": f"Unknown tool: {params.get('name')}"}
    else:
        reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    if "result" in reply:
        reply["result"] = {"resultType": "complete", **reply["result"]}
    return reply
'''


def planted(old, new):
    """A copy of the correct server with one bug planted in it."""
    assert old in CORRECT, f"mutant doesn't apply: {old!r}"
    return CORRECT.replace(old, new)


CALL_LOSES_ID = planted(
    """        try:
            reply["result"] = call_tool(params)
        except OrderNotFound as missing:
            reply["result"] = text_result(str(missing), is_error=True)
""",
    """        try:
            return {"jsonrpc": "2.0", "result": call_tool(params)}
        except OrderNotFound as missing:
            reply["result"] = text_result(str(missing), is_error=True)
""",
)
MISSING_ORDER_IS_PROTOCOL_ERROR = planted(
    'reply["result"] = text_result(str(missing), is_error=True)',
    'reply["error"] = {"code": -32603, "message": str(missing)}',
)
UNKNOWN_TOOL_IS_RESULT = planted(
    """reply["error"] = {"code": -32602, "message": f"Unknown tool: {params.get('name')}"}""",
    """reply["result"] = text_result(f"Unknown tool: {params.get('name')}", is_error=True)""",
)
SKIPS_VALIDATION = planted(
    """    if not isinstance(order_id, str) or not re.fullmatch(r"\\d{4}", order_id):
        return text_result("Invalid arguments: order_id must be four digits", is_error=True)
""",
    "",
)
FOUND_ORDER_FLAGGED_AS_ERROR = planted(
    "return text_result(json.dumps(ORDERS[order_id]))",
    "return text_result(json.dumps(ORDERS[order_id]), is_error=True)",
)


@cache
def run(module_source):
    """Run the learner's tests with pytest against one version of the server."""
    return pytest_run({MODULE: module_source, TEST_FILE: solution_source()})


def report(result):
    """pytest's own explanation of each failure: the E lines under each test's heading."""
    out, heading, shown = [], None, 0
    for line in result.output.splitlines():
        match = re.fullmatch(r"_{2,} (.+?) _{2,}", line)
        if match:
            heading, shown = match.group(1), 0
        elif line.startswith("E ") and heading and shown < 3:
            if shown == 0:
                out.append(heading + ":")
            out.append("    " + line[1:].strip().removeprefix("AssertionError: "))
            shown += 1
        elif "short test summary" in line:
            break
    return "\n".join(out[:15])


def clean(result):
    return result.total > 0 and not result.failed and not result.errors


def catches(buggy_source):
    """True if the learner's tests fail (or error) on the buggy copy."""
    assert clean(run(CORRECT)), "Make your tests pass cleanly on the correct server first (see the checks above)"
    result = run(buggy_source)
    return bool(result.failed or result.errors)


@test("Your tests pass on the correct orders_server.py")
def _():
    result = run(CORRECT)
    assert result.total > 0, "pytest didn't collect any tests. Name each test function test_something."
    assert result.errors == [], "pytest couldn't run some of your tests:\n" + report(result)
    assert result.failed == [], "These fail on the correct server, so they expect the wrong thing:\n" + report(result)


@test("Drives the server through McpHarness")
def _():
    assert source_uses(name="McpHarness"), "Test the protocol the way a client sees it, with McpHarness(handle)"


@test("Catches a tools/call reply that loses its id")
def _():
    assert catches(CALL_LOSES_ID), (
        "A bug slipped through: tools/call replies had no id, so no client could match them, and all "
        "your tests still passed. Call a tool through the harness.")


@hidden("Catches a missing order reported as a protocol error")
def _():
    assert catches(MISSING_ORDER_IS_PROTOCOL_ERROR), (
        "A bug slipped through: order 9999 came back as JSON-RPC error -32603 instead of an isError "
        "result the model can read, and all your tests still passed.")


@hidden("Catches an unknown tool reported as a tool result")
def _():
    assert catches(UNKNOWN_TOOL_IS_RESULT), (
        "A bug slipped through: an unknown tool came back as an isError result instead of a -32602 "
        "protocol error, and all your tests still passed. Use client.request to see the error.")


@hidden("Catches arguments that skip validation")
def _():
    assert catches(SKIPS_VALIDATION), (
        "A bug slipped through: order_id 10423 went straight to the lookup instead of being refused "
        "as invalid arguments, and all your tests still passed. Check the text, not only isError.")


@hidden("Catches a found order flagged as an error")
def _():
    assert catches(FOUND_ORDER_FLAGGED_AS_ERROR), (
        "A bug slipped through: order 1042 was found but flagged with isError: true, and all your "
        "tests still passed.")
