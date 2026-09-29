from plp import hidden, test
from solution import check_message


@test("A valid request has no problems, and the example's two problems are found")
def _():
    assert check_message({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}) == []
    assert check_message({"jsonrpc": "2.0", "id": True, "method": "tools/list", "params": ["1042"]}) == [
        "id must be a string or an integer",
        "params must be an object",
    ]


@test("Valid notifications, results and errors pass, including id 0 and a null id on an error")
def _():
    assert check_message({"jsonrpc": "2.0", "method": "notifications/initialized"}) == []
    assert check_message({"jsonrpc": "2.0", "id": 0, "result": {}}) == []
    assert check_message({"jsonrpc": "2.0", "id": "a1", "result": {"tools": []}}) == []
    assert check_message({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}) == []


@test("Not a dict, or the wrong version")
def _():
    assert check_message(["jsonrpc", "2.0"]) == ["message must be a JSON object"]
    assert check_message({"jsonrpc": 2.0, "id": 1, "method": "ping"}) == ['jsonrpc must be "2.0"']
    assert check_message({"id": 1, "method": "ping"}) == ['jsonrpc must be "2.0"']


@test("Requests: a real method, and no result or error")
def _():
    assert check_message({"jsonrpc": "2.0", "id": 3, "method": ""}) == ["method must be a non-empty string"]
    assert check_message({"jsonrpc": "2.0", "id": 3, "method": 42}) == ["method must be a non-empty string"]
    assert check_message({"jsonrpc": "2.0", "id": 3, "method": "ping", "result": {}}) == [
        "a request can't have result or error"
    ]


@test("Responses: an id, and exactly one of result and error")
def _():
    assert check_message({"jsonrpc": "2.0", "result": {}}) == ["a response needs an id"]
    assert check_message({"jsonrpc": "2.0", "id": 4}) == ["a response needs result or error"]
    both = {"jsonrpc": "2.0", "id": 4, "result": {}, "error": {"code": -32603, "message": "Internal error"}}
    assert check_message(both) == ["a response can't have both result and error"]


@hidden("A null id only on an error, and ids can't be floats or bools")
def _():
    assert check_message({"jsonrpc": "2.0", "id": None, "result": {}}) == ["id must be a string or an integer"]
    assert check_message({"jsonrpc": "2.0", "id": 1.5, "method": "ping"}) == ["id must be a string or an integer"]
    assert check_message({"jsonrpc": "2.0", "id": False, "result": {}}) == ["id must be a string or an integer"]


@hidden("A badly shaped error object")
def _():
    assert check_message({"jsonrpc": "2.0", "id": 9, "error": "Method not found"}) == [
        "error needs an integer code and a string message"
    ]
    assert check_message({"jsonrpc": "2.0", "id": 9, "error": {"code": "-32601", "message": "Method not found"}}) == [
        "error needs an integer code and a string message"
    ]
    assert check_message({"jsonrpc": "2.0", "id": 9, "error": {"code": -32601}}) == [
        "error needs an integer code and a string message"
    ]


@hidden("Several problems at once, in the tables' order")
def _():
    assert check_message({"jsonrpc": "1.0", "method": None, "id": [1], "params": "x", "error": {}}) == [
        'jsonrpc must be "2.0"',
        "method must be a non-empty string",
        "id must be a string or an integer",
        "params must be an object",
        "a request can't have result or error",
    ]
