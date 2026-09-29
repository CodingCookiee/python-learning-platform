import json

import httpx
from plp import hidden, test
from plp_fakes import anthropic_api, openai_api
from solution import parse_sse


def real_stream(provider, text):
    """The lines a real streaming response contains (from the course's fakes)."""
    api = anthropic_api([text]) if provider == "anthropic" else openai_api([text])
    base = "https://api.anthropic.com" if provider == "anthropic" else "https://api.openai.com"
    http = httpx.Client(transport=api.transport, base_url=base)
    body = {"model": "m", "max_tokens": 50, "stream": True, "messages": [{"role": "user", "content": "Hi"}]}
    if provider == "anthropic":
        headers = {"x-api-key": "sk-ant-test", "anthropic-version": "2023-06-01"}
        return http.post("/v1/messages", headers=headers, json=body).text.split("\n")
    return http.post("/v1/chat/completions", headers={"Authorization": "Bearer sk-test"}, json=body).text.split("\n")


@test("Parses named and unnamed events, like the example")
def _():
    lines = [
        "event: content_block_delta",
        'data: {"delta": {"text": "Order #1042 "}}',
        "",
        ": keep-alive",
        "",
        'data: {"choices": []}',
        "",
        "data: [DONE]",
    ]
    assert list(parse_sse(lines)) == [
        ("content_block_delta", '{"delta": {"text": "Order #1042 "}}'),
        (None, '{"choices": []}'),
        (None, "[DONE]"),
    ]


@test("Parses a real Anthropic stream")
def _():
    events = list(parse_sse(real_stream("anthropic", "Your refund was approved today.")))
    assert [name for name, _ in events] == [
        "message_start", "content_block_start", "content_block_delta", "content_block_delta",
        "content_block_delta", "content_block_stop", "message_delta", "message_stop",
    ]
    texts = [json.loads(data)["delta"]["text"] for name, data in events if name == "content_block_delta"]
    assert "".join(texts) == "Your refund was approved today."


@test("Parses a real OpenAI stream")
def _():
    events = list(parse_sse(real_stream("openai", "Your refund was approved today.")))
    assert {name for name, _ in events} == {None}
    assert events[-1] == (None, "[DONE]")
    assert json.loads(events[1][1])["choices"][0]["delta"]["content"] == "Your refund "


@test("Joins several data lines, and splits only at the first colon")
def _():
    lines = ["event: note", "data: line one", "data: time: 09:30", "data:no space", ""]
    assert list(parse_sse(lines)) == [("note", "line one\ntime: 09:30\nno space")]


@hidden("Ignores other fields and events without data, and resets the name")
def _():
    lines = ["id: 7", "retry: 3000", "event: ping", "", "data: {}", "", "event: done", "data: x", ""]
    assert list(parse_sse(lines)) == [(None, "{}"), ("done", "x")]


@hidden("Yields each event as soon as it ends")
def _():
    def network():
        yield "event: content_block_delta"
        yield 'data: {"text": "Hi"}'
        yield ""
        raise AssertionError("parse_sse read past the end of the first event before yielding it")

    assert next(parse_sse(network())) == ("content_block_delta", '{"text": "Hi"}')
