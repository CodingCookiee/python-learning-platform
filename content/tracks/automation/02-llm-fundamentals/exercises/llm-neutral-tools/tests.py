import copy

from plp import hidden, test
from solution import to_anthropic_tool, to_openai_tool

SCHEMA = {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]}
LOOKUP_ORDER = {"name": "lookup_order", "description": "Find an order by its number.", "parameters": SCHEMA}


@test("Translates a tool for both providers, like the example")
def _():
    assert to_anthropic_tool(LOOKUP_ORDER) == {
        "name": "lookup_order",
        "description": "Find an order by its number.",
        "input_schema": SCHEMA,
    }
    assert to_openai_tool(LOOKUP_ORDER) == {
        "type": "function",
        "function": {"name": "lookup_order", "description": "Find an order by its number.", "parameters": SCHEMA},
    }


@test("A tool without a description gets an empty one")
def _():
    tool = {"name": "list_plans", "parameters": {"type": "object", "properties": {}}}
    assert to_anthropic_tool(tool)["description"] == ""
    assert to_openai_tool(tool)["function"]["description"] == ""


@test("Leaves the neutral tool unchanged")
def _():
    tool = copy.deepcopy(LOOKUP_ORDER)
    to_anthropic_tool(tool)
    to_openai_tool(tool)
    assert tool == LOOKUP_ORDER


@hidden("Keeps nothing but the fields each provider expects")
def _():
    tool = {"name": "refund", "description": "Refund an order.", "parameters": SCHEMA}
    assert set(to_anthropic_tool(tool)) == {"name", "description", "input_schema"}
    assert set(to_openai_tool(tool)) == {"type", "function"}
    assert set(to_openai_tool(tool)["function"]) == {"name", "description", "parameters"}
