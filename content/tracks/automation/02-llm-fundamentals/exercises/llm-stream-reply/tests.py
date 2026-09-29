import json

import httpx
from plp import hidden, raises, test
from plp_fakes import Reply, Usage as FakeUsage, anthropic_api
from solution import LLMResponse, Usage, stream_reply

TEXT = "Yes! Order #1042 left our warehouse this morning."
ASK = [{"role": "user", "content": "Is order #1042 on its way?"}]


def connect(replies):
    api = anthropic_api(replies)
    return api, httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")


def raw_stream(events):
    sse = "".join(f"event: {name}\ndata: {json.dumps(data)}\n\n" for name, data in events)
    handler = lambda request: httpx.Response(200, text=sse, headers={"content-type": "text/event-stream"})
    return httpx.Client(transport=httpx.MockTransport(handler), base_url="https://api.anthropic.com")


def delta(text):
    return ("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text}})


START = ("message_start", {"type": "message_start", "message": {"model": "claude-sonnet-5", "usage": {"input_tokens": 30, "output_tokens": 0}}})


@test("Streams the deltas and returns the whole reply, like the example")
def _():
    api, http = connect([Reply(text=TEXT, usage=FakeUsage(7, 13))])
    shown = []
    reply = stream_reply(http, ASK, api_key="sk-ant-test", model="claude-haiku-4-5", on_delta=shown.append)
    assert shown == ["Yes! Order #", "1042 left ou", "r warehouse ", "this morning", "."]
    assert reply == LLMResponse(
        text=TEXT, tool_calls=[], stop_reason="end_turn", usage=Usage(input_tokens=7, output_tokens=13), model="claude-haiku-4-5",
    )


@test("Sends a streaming request")
def _():
    api, http = connect([TEXT])
    stream_reply(http, ASK, api_key="sk-ant-test", model="claude-haiku-4-5", on_delta=lambda text: None, system="Be brief.")
    assert api.last["headers"].get("x-api-key") == "sk-ant-test"
    assert api.last.json == {"model": "claude-haiku-4-5", "max_tokens": 1024, "messages": ASK, "stream": True, "system": "Be brief."}


@test("Reports a cut-off reply")
def _():
    api, http = connect([Reply(text="Dear Ada, your order", stop_reason="max_tokens", usage=FakeUsage(12, 5))])
    reply = stream_reply(http, ASK, api_key="sk-ant-test", model="claude-haiku-4-5", on_delta=lambda text: None, max_tokens=5)
    assert (reply.stop_reason, reply.usage) == ("max_tokens", Usage(12, 5))


@test("Takes the model and usage from the events, and skips pings")
def _():
    events = [
        START,
        ("ping", {"type": "ping"}),
        delta("Refund "),
        delta("approved."),
        ("message_delta", {"type": "message_delta", "delta": {"stop_reason": "stop_sequence"}, "usage": {"output_tokens": 4}}),
        ("message_stop", {"type": "message_stop"}),
    ]
    reply = stream_reply(raw_stream(events), ASK, api_key="k", model="claude-haiku-4-5", on_delta=lambda text: None)
    assert reply == LLMResponse("Refund approved.", [], "end_turn", Usage(30, 4), "claude-sonnet-5")


@test("An error event partway through raises, after the earlier deltas were shown")
def _():
    events = [
        START,
        delta("Your order "),
        ("error", {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}),
    ]
    shown = []
    with raises(RuntimeError, match="Overloaded", what="stream_reply(...) on a stream that fails"):
        stream_reply(raw_stream(events), ASK, api_key="k", model="m", on_delta=shown.append)
    assert shown == ["Your order "]


@hidden("Raises HTTPStatusError for a refused key")
def _():
    api, http = connect([TEXT])
    raises(httpx.HTTPStatusError, stream_reply, http, ASK, api_key="", model="claude-haiku-4-5", on_delta=print)
