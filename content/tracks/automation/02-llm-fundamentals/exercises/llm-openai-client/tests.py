import json

import httpx
from plp import hidden, raises, test
from plp_fakes import Reply, Usage as FakeUsage, openai_api, tool_call
from solution import LLMResponse, OpenAIClient, ToolCall, Usage, to_openai_messages

LOOKUP_ORDER = {
    "name": "lookup_order",
    "description": "Find an order by its number.",
    "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]},
}
LEAD = [{"role": "user", "content": "Classify this lead: 'We need 40 seats by Friday.'"}]
HISTORY = [
    {"role": "user", "content": "Where is order 1042?"},
    {"role": "assistant", "content": "", "tool_calls": [{"id": "call_1", "name": "lookup_order", "arguments": {"order_id": "1042"}}]},
    {"role": "tool", "tool_call_id": "call_1", "content": '{"status": "shipped"}'},
]


def gpt(replies, model="gpt-fake", key="sk-test"):
    api = openai_api(replies)
    http = httpx.Client(transport=api.transport, base_url="https://api.openai.com")
    return api, OpenAIClient(http, api_key=key, model=model)


@test("Returns a neutral LLMResponse, like the example")
def _():
    api, client = gpt([Reply(text="hot", usage=FakeUsage(24, 1))])
    assert client.complete(LEAD, system="Reply hot, warm or cold.") == LLMResponse(
        text="hot", tool_calls=[], stop_reason="end_turn", usage=Usage(input_tokens=24, output_tokens=1), model="gpt-fake",
    )


@test("Sends the bearer token, the system prompt first, and max_completion_tokens")
def _():
    api, client = gpt(["hot"])
    client.complete(LEAD, system="Reply hot, warm or cold.")
    assert api.last["path"] == "/v1/chat/completions"
    assert api.last["headers"].get("authorization") == "Bearer sk-test"
    assert api.last.json == {
        "model": "gpt-fake",
        "max_completion_tokens": 1024,
        "messages": [{"role": "system", "content": "Reply hot, warm or cold."}, *LEAD],
    }


@test("Sends model, max_tokens, temperature and wrapped tools when given")
def _():
    api, client = gpt(["hot"])
    client.complete(LEAD, tools=[LOOKUP_ORDER], model="gpt-fake-large", max_tokens=5, temperature=0)
    body = api.last.json
    assert (body["model"], body["max_completion_tokens"], body.get("temperature")) == ("gpt-fake-large", 5, 0)
    assert body["tools"] == [{"type": "function", "function": {
        "name": "lookup_order", "description": "Find an order by its number.", "parameters": LOOKUP_ORDER["parameters"]}}]
    assert [m["role"] for m in body["messages"]] == ["user"]


@test("Reads tool calls with their arguments parsed")
def _():
    call = tool_call("lookup_order", order_id="1042")
    api, client = gpt([call])
    response = client.complete([{"role": "user", "content": "Where is order 1042?"}], tools=[LOOKUP_ORDER])
    assert response.tool_calls == [ToolCall(id=call.id, name="lookup_order", arguments={"order_id": "1042"})]
    assert (response.text, response.stop_reason) == ("", "tool_use")


@test("Translates a tool history, with arguments as a JSON string")
def _():
    translated = to_openai_messages(HISTORY, system="You are a support agent.")
    assert [m["role"] for m in translated] == ["system", "user", "assistant", "tool"]
    assistant = translated[2]
    assert assistant["content"] is None
    function = assistant["tool_calls"][0]["function"]
    assert isinstance(function["arguments"], str), "arguments must be sent as a JSON string"
    assert json.loads(function["arguments"]) == {"order_id": "1042"}
    assert (assistant["tool_calls"][0]["id"], assistant["tool_calls"][0]["type"], function["name"]) == ("call_1", "function", "lookup_order")
    assert translated[3] == {"role": "tool", "tool_call_id": "call_1", "content": '{"status": "shipped"}'}


@hidden("complete() sends the translated history, and there's no system message without a system prompt")
def _():
    api, client = gpt(["Order #1042 shipped on Monday."])
    assert client.complete(HISTORY, tools=[LOOKUP_ORDER]).text == "Order #1042 shipped on Monday."
    assert api.last.json["messages"] == to_openai_messages(HISTORY)
    assert [m["role"] for m in api.last.json["messages"]] == ["user", "assistant", "tool"]


@hidden("Maps a cut-off reply, hides the key, and raises for a refused key")
def _():
    api, client = gpt([Reply(text="Dear Ada,", stop_reason="max_tokens")], key="sk-very-secret")
    assert client.complete(LEAD, max_tokens=3).stop_reason == "max_tokens"
    assert "sk-very-secret" not in repr(client) and "gpt-fake" in repr(client)
    api, refused = gpt(["never sent"], key="")
    raises(httpx.HTTPStatusError, refused.complete, LEAD)
