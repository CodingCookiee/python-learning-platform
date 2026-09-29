from plp import hidden, test
from solution import neutral_tools

GET_ORDER = {"name": "get_order", "title": "Get order", "description": "Look up an order.",
             "inputSchema": {"type": "object", "properties": {"order_id": {"type": "string"}}},
             "annotations": {"readOnlyHint": True}}
SEARCH = {"name": "search_docs", "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}},
                                                 "required": ["query"]},
          "outputSchema": {"type": "object"}}


@test("Translates the example with a prefix")
def _():
    assert neutral_tools([GET_ORDER], prefix="orders") == [{
        "name": "orders__get_order", "description": "Look up an order.",
        "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}}}]


@test("Without a prefix, names are unchanged, and a missing description is empty")
def _():
    assert neutral_tools([GET_ORDER, SEARCH]) == [
        {"name": "get_order", "description": "Look up an order.", "parameters": GET_ORDER["inputSchema"]},
        {"name": "search_docs", "description": "", "parameters": SEARCH["inputSchema"]},
    ]


@test("An empty list gives an empty list")
def _():
    assert neutral_tools([], prefix="wiki") == []


@hidden("The parameters are a copy of the schema")
def _():
    tools = neutral_tools([SEARCH], prefix="wiki")
    tools[0]["parameters"]["additionalProperties"] = False
    assert "additionalProperties" not in SEARCH["inputSchema"]
    assert tools[0]["parameters"] is not SEARCH["inputSchema"]
