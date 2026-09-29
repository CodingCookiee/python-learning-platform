import httpx
from plp import hidden, raises, test
from plp_fakes import Reply, Usage, anthropic_api, openai_api, tool_call
from solution import read_reply


def real_payload(provider, reply):
    """What the provider's API would really send back for this reply (from the course's fakes)."""
    if provider == "anthropic":
        api = anthropic_api([reply])
        http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
        headers = {"x-api-key": "sk-ant-test", "anthropic-version": "2023-06-01"}
        body = {"model": "claude-haiku-4-5", "max_tokens": 300, "messages": [{"role": "user", "content": "Hi"}]}
        return http.post("/v1/messages", headers=headers, json=body).json()
    api = openai_api([reply])
    http = httpx.Client(transport=api.transport, base_url="https://api.openai.com")
    body = {"model": "gpt-fake", "messages": [{"role": "user", "content": "Hi"}]}
    return http.post("/v1/chat/completions", headers={"Authorization": "Bearer sk-test"}, json=body).json()


@test("Reads an OpenAI reply, like the example")
def _():
    payload = {
        "choices": [{"message": {"role": "assistant", "content": "Lead looks hot."}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 42, "completion_tokens": 5, "total_tokens": 47},
        "model": "gpt-fake",
    }
    assert read_reply("openai", payload) == {
        "text": "Lead looks hot.", "stop_reason": "end_turn", "input_tokens": 42, "output_tokens": 5,
    }


@test("Reads the same reply from both providers into the same dict")
def _():
    reply = Reply(text="Refund approved for order #1042.", usage=Usage(120, 9))
    expected = {"text": "Refund approved for order #1042.", "stop_reason": "end_turn", "input_tokens": 120, "output_tokens": 9}
    assert read_reply("anthropic", real_payload("anthropic", reply)) == expected
    assert read_reply("openai", real_payload("openai", reply)) == expected


@test("A reply cut off at the limit says max_tokens on both")
def _():
    reply = Reply(text="Dear Ada, thank you for", stop_reason="max_tokens", usage=Usage(80, 6))
    assert read_reply("anthropic", real_payload("anthropic", reply))["stop_reason"] == "max_tokens"
    assert read_reply("openai", real_payload("openai", reply))["stop_reason"] == "max_tokens"


@test("A tool call has empty text and says tool_use on both")
def _():
    reply = tool_call("lookup_order", order_id="1042")
    for provider in ("anthropic", "openai"):
        result = read_reply(provider, real_payload(provider, reply))
        assert (provider, result["text"], result["stop_reason"]) == (provider, "", "tool_use")


@hidden("Joins every Anthropic text block, and maps stop_sequence")
def _():
    payload = {
        "content": [
            {"type": "text", "text": "Order #1042: "},
            {"type": "tool_use", "id": "toolu_1", "name": "lookup_order", "input": {}},
            {"type": "text", "text": "shipped."},
        ],
        "stop_reason": "stop_sequence",
        "usage": {"input_tokens": 10, "output_tokens": 4},
        "model": "claude-haiku-4-5",
    }
    assert read_reply("anthropic", payload)["text"] == "Order #1042: shipped."
    assert read_reply("anthropic", payload)["stop_reason"] == "end_turn"


@hidden("Passes unknown stop reasons through, and refuses unknown providers")
def _():
    payload = {
        "choices": [{"message": {"role": "assistant", "content": None}, "finish_reason": "content_filter"}],
        "usage": {"prompt_tokens": 12, "completion_tokens": 0, "total_tokens": 12},
        "model": "gpt-fake",
    }
    assert read_reply("openai", payload)["stop_reason"] == "content_filter"
    assert read_reply("openai", payload)["text"] == ""
    raises(ValueError, read_reply, "gemini", payload)
