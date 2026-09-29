from plp import hidden, raises, test
from solution import message_kind


@test("Sorts the four messages in the example")
def _():
    assert message_kind({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}) == "request"
    assert message_kind({"jsonrpc": "2.0", "method": "notifications/initialized"}) == "notification"
    assert message_kind({"jsonrpc": "2.0", "id": 1, "result": {"tools": []}}) == "result"
    assert message_kind({"jsonrpc": "2.0", "id": 2, "error": {"code": -32601, "message": "Method not found"}}) == "error"


@test("A request with id 0 is still a request")
def _():
    assert message_kind({"jsonrpc": "2.0", "id": 0, "method": "ping"}) == "request"


@test("String ids work too, and params don't change the kind")
def _():
    assert message_kind({"jsonrpc": "2.0", "id": "req-7", "method": "tools/call",
                         "params": {"name": "get_order", "arguments": {"order_id": "1042"}}}) == "request"
    assert message_kind({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 7}}) == "notification"


@test("Anything that isn't JSON-RPC 2.0 is refused")
def _():
    raises(ValueError, message_kind, {"jsonrpc": "1.0", "id": 1, "method": "ping"}, match="Not a JSON-RPC 2.0 message")
    raises(ValueError, message_kind, {"id": 1, "method": "ping"}, match="Not a JSON-RPC 2.0 message")


@hidden("An error with a null id is an error, and an empty result is a result")
def _():
    assert message_kind({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}) == "error"
    assert message_kind({"jsonrpc": "2.0", "id": 5, "result": {}}) == "result"


@hidden("The version must be the string 2.0, not the number")
def _():
    raises(ValueError, message_kind, {"jsonrpc": 2.0, "id": 1, "method": "ping"})
