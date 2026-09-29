import inspect
import json

import httpx
from plp import hidden, raises, test
from plp_fakes import anthropic_api, openai_api
from solution import stream_anthropic, stream_openai

REPLY = "Sorry, your order #1042 is running two days late. It ships Thursday."
ASK = [{"role": "user", "content": "Draft a reply: order #1042 is two days late."}]
# The fakes stream text in 12-character pieces
PIECES = [REPLY[i : i + 12] for i in range(0, len(REPLY), 12)]


def connect(provider, replies=(REPLY,)):
    api = anthropic_api(list(replies)) if provider == "anthropic" else openai_api(list(replies))
    base = "https://api.anthropic.com" if provider == "anthropic" else "https://api.openai.com"
    return api, httpx.Client(transport=api.transport, base_url=base)


def raw_stream(sse_text):
    """A client whose server sends exactly this SSE text."""
    handler = lambda request: httpx.Response(200, text=sse_text, headers={"content-type": "text/event-stream"})
    return httpx.Client(transport=httpx.MockTransport(handler), base_url="https://api.example.com")


@test("Streams Claude's reply in pieces, like the example")
def _():
    api, http = connect("anthropic")
    assert list(stream_anthropic(http, ASK, api_key="sk-ant-test", model="claude-haiku-4-5")) == PIECES


@test("Anthropic: sends a streaming request with the right headers and body")
def _():
    api, http = connect("anthropic")
    list(stream_anthropic(http, ASK, api_key="sk-ant-test", model="claude-haiku-4-5", system="Be kind.", max_tokens=200))
    assert api.last["path"] == "/v1/messages"
    assert (api.last["headers"].get("x-api-key"), api.last["headers"].get("anthropic-version")) == ("sk-ant-test", "2023-06-01")
    assert api.last.json == {"model": "claude-haiku-4-5", "max_tokens": 200, "messages": ASK, "stream": True, "system": "Be kind."}


@test("OpenAI: streams the reply, with the system prompt first")
def _():
    api, http = connect("openai")
    deltas = stream_openai(http, ASK, api_key="sk-test", model="gpt-fake", system="Be kind.")
    assert list(deltas) == PIECES
    assert api.last["path"] == "/v1/chat/completions"
    assert api.last["headers"].get("authorization") == "Bearer sk-test"
    assert api.last.json == {
        "model": "gpt-fake", "max_completion_tokens": 1024, "stream": True,
        "messages": [{"role": "system", "content": "Be kind."}, *ASK],
    }


@test("Both are lazy: nothing is sent until the first delta is asked for")
def _():
    api, http = connect("anthropic")
    deltas = stream_anthropic(http, ASK, api_key="sk-ant-test", model="claude-haiku-4-5")
    assert inspect.isgenerator(deltas), "stream_anthropic should be a generator function (use yield)"
    assert api.requests == [], "a request was sent before anything iterated over the stream"
    assert next(deltas) == PIECES[0]
    api, http = connect("openai")
    deltas = stream_openai(http, ASK, api_key="sk-test", model="gpt-fake")
    assert api.requests == [], "a request was sent before anything iterated over the stream"
    assert next(deltas) == PIECES[0]


@hidden("Anthropic: skips pings and non-text deltas")
def _():
    events = [
        ("message_start", {"type": "message_start", "message": {"usage": {"input_tokens": 9}}}),
        ("ping", {"type": "ping"}),
        ("content_block_delta", {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Checking "}}),
        ("content_block_delta", {"type": "content_block_delta", "delta": {"type": "input_json_delta", "partial_json": "{\"order"}}),
        ("content_block_delta", {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "now."}}),
        ("message_stop", {"type": "message_stop"}),
    ]
    sse = "".join(f"event: {name}\ndata: {json.dumps(data)}\n\n" for name, data in events)
    assert list(stream_anthropic(raw_stream(sse), ASK, api_key="k", model="m")) == ["Checking ", "now."]


@hidden("OpenAI: skips chunks without choices, and stops at [DONE]")
def _():
    chunks = [
        {"choices": [{"index": 0, "delta": {"role": "assistant"}}]},
        {"choices": [{"index": 0, "delta": {"content": "Ships "}}]},
        {"choices": [{"index": 0, "delta": {"content": "Thursday."}}]},
        {"choices": [], "usage": {"prompt_tokens": 20, "completion_tokens": 4}},
    ]
    sse = "".join(f"data: {json.dumps(chunk)}\n\n" for chunk in chunks) + "data: [DONE]\n\ndata: not json\n\n"
    assert list(stream_openai(raw_stream(sse), ASK, api_key="k", model="m")) == ["Ships ", "Thursday."]


@hidden("Raises HTTPStatusError for a refused key")
def _():
    api, http = connect("anthropic")
    with raises(httpx.HTTPStatusError, what="list(stream_anthropic(..., api_key=''))"):
        list(stream_anthropic(http, ASK, api_key="", model="claude-haiku-4-5"))
    api, http = connect("openai")
    with raises(httpx.HTTPStatusError, what="list(stream_openai(..., api_key=''))"):
        list(stream_openai(http, ASK, api_key="", model="gpt-fake"))
