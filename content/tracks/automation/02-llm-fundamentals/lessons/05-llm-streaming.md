---
slug: llm-streaming
title: Streaming replies
summary: Parse server-sent events from both providers into a generator of text deltas, so replies appear as they're written.
minutes: 40
exercises:
  - llm-predict-sse
  - llm-parse-sse
  - llm-stream-deltas
  - llm-stream-reply
---

A model writes a 300-word reply one token at a time, and a normal request makes you wait for the
last token before you see the first. In a chat widget or a Slack bot that's several seconds of
nothing, and users assume it's broken. With **streaming**, the API sends each piece of text as soon
as it's generated, so the first words appear in a fraction of a second. Both providers stream the
same way, with server-sent events, and a Python generator is the natural shape for the result.

## Server-sent events

Set `"stream": true` in the request body and the response becomes a stream of **server-sent
events** (SSE), a plain-text format with content type `text/event-stream`. Each event is a few
`field: value` lines followed by a **blank line**, which is what marks the end of an event:

```text
event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Order #1042 "}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "has shipped."}}

```

The rules fit in a few lines: `event:` names the event, `data:` carries the payload (several `data:`
lines are joined with newlines), a line starting with `:` is a comment servers send to keep the
connection open, and one space after the colon is dropped.

```python
def parse_sse(lines):
    event, data = None, []
    for line in lines:
        if line == "":
            if data:
                yield event, "\n".join(data)
            event, data = None, []
        elif not line.startswith(":"):
            field, _, value = line.partition(":")
            value = value.removeprefix(" ")
            if field == "event":
                event = value
            elif field == "data":
                data.append(value)


stream = 'event: ping\ndata: {"type": "ping"}\n\n: keep-alive\n\ndata: {"n": 1}\n\n'
list(parse_sse(stream.split("\n")))
```

The second event has no `event:` line, so its name is `None`. That's how OpenAI's stream looks.

## What each provider sends

Anthropic names every event. A text reply arrives as:

| Event | Carries |
|-------|---------|
| `message_start` | the message's id, model and `usage.input_tokens` |
| `content_block_start` | the start of a content block (text or tool use) |
| `content_block_delta` | a piece of the block: `delta.type` is `text_delta` with `delta.text` |
| `content_block_stop` | the end of the block |
| `message_delta` | `delta.stop_reason` and `usage.output_tokens` |
| `message_stop` | the end of the stream |

It may also send `ping` events at any point, and an `error` event (for example, overloaded) partway
through a stream that started with a 200. A tool call streams its arguments as `input_json_delta`
pieces of JSON, which A3 deals with; for text you only want `text_delta`.

OpenAI sends unnamed events whose data is a **chunk** shaped like a response, with a `delta` where
the message would be, and ends with a literal `[DONE]` that isn't JSON:

```text
data: {"object": "chat.completion.chunk", "choices": [{"index": 0, "delta": {"role": "assistant"}}]}

data: {"object": "chat.completion.chunk", "choices": [{"index": 0, "delta": {"content": "Order #1042 "}}]}

data: {"object": "chat.completion.chunk", "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]}

data: [DONE]

```

Add `"stream_options": {"include_usage": true}` to get token counts: they come in one extra chunk at
the end, whose `choices` list is empty. Code that reads `chunk["choices"][0]` without checking
crashes on it.

```python
import json

events = [
    (None, '{"choices": [{"index": 0, "delta": {"role": "assistant"}}]}'),
    (None, '{"choices": [{"index": 0, "delta": {"content": "Order #1042 "}}]}'),
    (None, '{"choices": [{"index": 0, "delta": {"content": "has shipped."}}]}'),
    (None, '{"choices": [], "usage": {"prompt_tokens": 20, "completion_tokens": 5}}'),
    (None, "[DONE]"),
]


def openai_text(events):
    for _, data in events:
        if data == "[DONE]":
            return
        chunk = json.loads(data)
        if chunk["choices"] and chunk["choices"][0]["delta"].get("content"):
            yield chunk["choices"][0]["delta"]["content"]


list(openai_text(events))
```

## Streaming with httpx

`http.post()` reads the whole body before returning, which defeats the point. `http.stream()` is a
context manager that returns as soon as the headers arrive; `iter_lines()` then yields lines as they
come off the network:

```python norun
import os

import httpx

http = httpx.Client(base_url="https://api.anthropic.com", timeout=60)
body = {
    "model": "claude-haiku-4-5", "max_tokens": 400, "stream": True,
    "messages": [{"role": "user", "content": "Draft a reply: order #1042 is delayed by two days."}],
}
headers = {"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"}

with http.stream("POST", "/v1/messages", json=body, headers=headers) as response:
    response.raise_for_status()
    for line in response.iter_lines():
        print(line)
```

A fake transport can return a stream too: give `httpx.Response` the SSE text as its content. Here is
the whole pipeline, from bytes to text deltas:

```python
import json

import httpx

SSE = "".join(
    f"event: {name}\ndata: {json.dumps(data)}\n\n"
    for name, data in [
        ("message_start", {"type": "message_start", "message": {"model": "claude-haiku-4-5", "usage": {"input_tokens": 18}}}),
        ("content_block_delta", {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Your order "}}),
        ("ping", {"type": "ping"}),
        ("content_block_delta", {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "ships Thursday."}}),
        ("message_stop", {"type": "message_stop"}),
    ]
)
http = httpx.Client(
    transport=httpx.MockTransport(lambda request: httpx.Response(200, text=SSE, headers={"content-type": "text/event-stream"})),
    base_url="https://api.anthropic.com",
)


def parse_sse(lines):
    event, data = None, []
    for line in lines:
        if line == "":
            if data:
                yield event, "\n".join(data)
            event, data = None, []
        elif not line.startswith(":"):
            field, _, value = line.partition(":")
            if field == "event":
                event = value.removeprefix(" ")
            elif field == "data":
                data.append(value.removeprefix(" "))


def stream_text(http, body):
    with http.stream("POST", "/v1/messages", json={**body, "stream": True}) as response:
        response.raise_for_status()
        for event, data in parse_sse(response.iter_lines()):
            payload = json.loads(data)
            if event == "content_block_delta" and payload["delta"]["type"] == "text_delta":
                yield payload["delta"]["text"]


for delta in stream_text(http, {"model": "claude-haiku-4-5", "max_tokens": 400, "messages": []}):
    print(delta, end="|")
```

> [!JS]
> Coming from JavaScript: this is `fetch()` followed by `response.body.getReader()` and a
> `TextDecoder`, except that `iter_lines()` does the buffering and line-splitting for you. The
> browser's `EventSource` can't send a POST body or headers, which is why nobody uses it for LLM APIs.

## Generators keep it lazy

`stream_text` is a generator, and that's what makes streaming work end to end:

- **Nothing happens until someone iterates.** Calling `stream_text(...)` sends no request; the first
  `next()` does. A caller that decides not to use the reply pays for nothing.
- **Each delta is handed on as it arrives.** The caller can print it, push it to a websocket or edit
  a Slack message, without the generator knowing which.
- **Stopping early closes the connection.** If the caller `break`s out of the loop, Python closes
  the generator, the `with` block exits, and httpx closes the response. The provider stops
  generating (and billing) soon after.

```quiz
question: You call stream_text(http, body) and store the result, but never loop over it. What happens?
options:
  - The request is sent and the reply is buffered in memory
  - "Nothing: no request is sent until the generator is iterated"
  - The request is sent, and the stream is closed when the program exits
answer: 1
explain: "A generator function's body doesn't start running until the first next(). That's why the tests in this lesson's drills check that no request was sent before iterating."
```

> [!WARNING]
> A stream that started with a 200 can still fail halfway: Anthropic sends an `error` event, and
> either provider can drop the connection. Don't save a partial reply as if it were complete; the
> stop reason arrives only at the end, so check it before you trust the text.

## Where this leaves you

Streaming replies arrive as server-sent events: named or unnamed `data:` lines, each event ended by
a blank line. Anthropic's text is in `content_block_delta` events with a `text_delta`; OpenAI's is in
each chunk's `choices[0].delta.content`, until `[DONE]`. `http.stream()` with `iter_lines()` reads
them as they arrive, and a generator turns them into text deltas lazily. The drills have you predict
what a parser yields, write a spec-following SSE parser, stream both providers, and rebuild a full
`LLMResponse`, usage included, from a stream.
