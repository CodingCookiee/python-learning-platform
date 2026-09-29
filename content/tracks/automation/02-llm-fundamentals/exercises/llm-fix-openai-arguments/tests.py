import httpx
from plp import hidden, raises, test
from plp_fakes import openai_api, tool_call
from solution import ToolCall, parse_openai_message


def lookup_order(order_id):
    return {"order_id": order_id, "status": "shipped"}


def openai_message(reply):
    """The assistant message the OpenAI API really sends for this reply (from the course's fake)."""
    api = openai_api([reply])
    http = httpx.Client(transport=api.transport, base_url="https://api.openai.com")
    body = {"model": "gpt-fake", "messages": [{"role": "user", "content": "Where is order 1042?"}]}
    response = http.post("/v1/chat/completions", headers={"Authorization": "Bearer sk-test"}, json=body)
    return response.json()["choices"][0]["message"]


@test("Parses the arguments into a dict, like the example")
def _():
    message = {
        "role": "assistant",
        "content": None,
        "tool_calls": [{"id": "call_7", "type": "function",
                        "function": {"name": "lookup_order", "arguments": "{\"order_id\": \"1042\"}"}}],
    }
    assert parse_openai_message(message) == ("", [ToolCall(id="call_7", name="lookup_order", arguments={"order_id": "1042"})])


@test("The parsed arguments can be passed straight to the tool")
def _():
    call = tool_call("lookup_order", order_id="1042")
    text, calls = parse_openai_message(openai_message(call))
    assert lookup_order(**calls[0].arguments) == {"order_id": "1042", "status": "shipped"}


@test("Parses several calls, keeping ids, names and nested values")
def _():
    calls = [tool_call("lookup_order", order_id="1042"), tool_call("add_note", order_id="1042", tags=["fragile", "vip"], priority=2)]
    text, parsed = parse_openai_message(openai_message(calls))
    assert parsed == [
        ToolCall(id=calls[0].id, name="lookup_order", arguments={"order_id": "1042"}),
        ToolCall(id=calls[1].id, name="add_note", arguments={"order_id": "1042", "tags": ["fragile", "vip"], "priority": 2}),
    ]


@hidden("A plain text reply has no tool calls")
def _():
    assert parse_openai_message(openai_message("Order #1042 shipped on Monday.")) == ("Order #1042 shipped on Monday.", [])


@hidden("A tool with no arguments gets an empty dict, and broken JSON is an error")
def _():
    message = {"role": "assistant", "content": None, "tool_calls": [
        {"id": "call_1", "type": "function", "function": {"name": "list_plans", "arguments": "{}"}}]}
    assert parse_openai_message(message)[1][0].arguments == {}
    broken = {"role": "assistant", "content": None, "tool_calls": [
        {"id": "call_2", "type": "function", "function": {"name": "lookup_order", "arguments": "{\"order_id\": "}}]}
    raises(ValueError, parse_openai_message, broken)
