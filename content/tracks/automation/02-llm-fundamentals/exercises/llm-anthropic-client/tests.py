import httpx
from plp import hidden, raises, test
from plp_fakes import Reply, Usage as FakeUsage, anthropic_api, tool_call
from solution import AnthropicClient, LLMResponse, ToolCall, Usage

LOOKUP_ORDER = {
    "name": "lookup_order",
    "description": "Find an order by its number.",
    "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]},
}
QUESTION = [{"role": "user", "content": "Summarise: order #1042 arrived cracked."}]


def claude(replies, model="claude-haiku-4-5", key="sk-ant-test"):
    api = anthropic_api(replies)
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    return api, AnthropicClient(http, api_key=key, model=model)


@test("Returns a neutral LLMResponse, like the example")
def _():
    api, client = claude([Reply(text="Order #1042 arrived with a cracked screen.", usage=FakeUsage(17, 11))])
    assert client.complete(QUESTION, system="One sentence.", max_tokens=100) == LLMResponse(
        text="Order #1042 arrived with a cracked screen.",
        tool_calls=[],
        stop_reason="end_turn",
        usage=Usage(input_tokens=17, output_tokens=11),
        model="claude-haiku-4-5",
    )


@test("Sends the headers, and a body with only what was given")
def _():
    api, client = claude(["Done."])
    client.complete(QUESTION)
    assert api.last["path"] == "/v1/messages"
    assert api.last["headers"].get("x-api-key") == "sk-ant-test"
    assert api.last["headers"].get("anthropic-version") == "2023-06-01"
    assert api.last.json == {"model": "claude-haiku-4-5", "max_tokens": 1024, "messages": QUESTION}


@test("Sends system, model, max_tokens and temperature when given, even temperature 0")
def _():
    api, client = claude(["Done."])
    client.complete(QUESTION, system="One sentence.", model="claude-sonnet-5", max_tokens=200, temperature=0)
    body = api.last.json
    assert (body["system"], body["model"], body["max_tokens"], body.get("temperature")) == (
        "One sentence.", "claude-sonnet-5", 200, 0,
    )


@test("Offers tools with input_schema and reads the tool calls back")
def _():
    call = tool_call("lookup_order", order_id="1042")
    api, client = claude([call])
    response = client.complete([{"role": "user", "content": "Where is order 1042?"}], tools=[LOOKUP_ORDER])
    assert api.last.json["tools"] == [
        {"name": "lookup_order", "description": "Find an order by its number.", "input_schema": LOOKUP_ORDER["parameters"]}
    ]
    assert response.tool_calls == [ToolCall(id=call.id, name="lookup_order", arguments={"order_id": "1042"})]
    assert (response.text, response.stop_reason) == ("", "tool_use")


@test("Translates a history with tool results")
def _():
    api, client = claude(["Order #1042 shipped on Monday."])
    history = [
        {"role": "user", "content": "Where is order 1042?"},
        {"role": "assistant", "content": "", "tool_calls": [{"id": "call_1", "name": "lookup_order", "arguments": {"order_id": "1042"}}]},
        {"role": "tool", "tool_call_id": "call_1", "content": '{"status": "shipped"}'},
    ]
    assert client.complete(history, tools=[LOOKUP_ORDER]).text == "Order #1042 shipped on Monday."
    sent = api.last.json["messages"]
    assert [m["role"] for m in sent] == ["user", "assistant", "user"]
    assert sent[2]["content"] == [{"type": "tool_result", "tool_use_id": "call_1", "content": '{"status": "shipped"}'}]


@test("repr shows the model and hides the key")
def _():
    api, client = claude([], key="sk-ant-very-secret")
    assert "claude-haiku-4-5" in repr(client)
    assert "sk-ant-very-secret" not in repr(client)


@hidden("Reports a cut-off reply and the model the API names")
def _():
    api, client = claude([Reply(text="Dear Ada, thanks for", stop_reason="max_tokens")], model="claude-opus-5-5")
    response = client.complete(QUESTION, max_tokens=5)
    assert (response.stop_reason, response.model) == ("max_tokens", "claude-opus-5-5")


@hidden("Raises HTTPStatusError when the key is refused")
def _():
    api, client = claude(["never sent"], key="")
    raises(httpx.HTTPStatusError, client.complete, QUESTION)
