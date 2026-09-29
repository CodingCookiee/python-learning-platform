---
slug: llm-two-apis
title: The two APIs side by side
summary: The Anthropic Messages API and the OpenAI Chat Completions API at the HTTP level, where they agree and the six places they differ.
minutes: 40
exercises:
  - llm-raw-anthropic-call
  - llm-fix-bearer-header
  - llm-fix-anthropic-system
  - llm-read-reply
---

Your client runs on Anthropic today, their largest customer insists on OpenAI, and next year either
could be cheaper. So you'll write every automation against your own interface and translate to each
provider underneath, which you'll build in the next lesson. First you need to know both APIs at
the level of the HTTP request, because that's where they differ, and those differences are exactly
what your adapters will translate.

Both are JSON over HTTPS: you `POST` a list of messages and get the model's reply back. You already
know how to do that with httpx from module 14.

## The Anthropic Messages API

One endpoint, `POST https://api.anthropic.com/v1/messages`, with the key in an `x-api-key` header and
an `anthropic-version` header that pins the request and response format:

```python norun
import os

import httpx

http = httpx.Client(base_url="https://api.anthropic.com", timeout=60)
response = http.post(
    "/v1/messages",
    headers={
        "x-api-key": os.environ["ANTHROPIC_API_KEY"],
        "anthropic-version": "2023-06-01",
    },
    json={
        "model": "claude-haiku-4-5",
        "max_tokens": 300,
        "system": "You summarise support tickets in one sentence.",
        "messages": [{"role": "user", "content": "My order #1042 arrived with a cracked screen."}],
    },
)
response.raise_for_status()
response.json()["content"][0]["text"]
```

`max_tokens` is required: Anthropic makes you say how long the reply may be. The response is a
message whose `content` is a list of **blocks**, because a reply can mix text with tool calls (A3):

```text
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "model": "claude-haiku-4-5",
  "content": [{"type": "text", "text": "The customer's order #1042 arrived with a cracked screen."}],
  "stop_reason": "end_turn",
  "usage": {"input_tokens": 31, "output_tokens": 15}
}
```

You don't need a key to try the shape. A fake server is just a function from request to response,
given to httpx as a `MockTransport`, the same technique as module 14. This one checks the headers the
way the real API does:

```python
import httpx


def fake_anthropic(request):
    if "x-api-key" not in request.headers or "anthropic-version" not in request.headers:
        error = {"type": "authentication_error", "message": "x-api-key header is required"}
        return httpx.Response(401, json={"type": "error", "error": error})
    return httpx.Response(200, json={
        "type": "message", "role": "assistant", "model": "claude-haiku-4-5",
        "content": [{"type": "text", "text": "Order #1042 arrived with a cracked screen."}],
        "stop_reason": "end_turn", "usage": {"input_tokens": 31, "output_tokens": 12},
    })


http = httpx.Client(transport=httpx.MockTransport(fake_anthropic), base_url="https://api.anthropic.com")
response = http.post(
    "/v1/messages",
    headers={"x-api-key": "test-key", "anthropic-version": "2023-06-01"},
    json={"model": "claude-haiku-4-5", "max_tokens": 300,
          "messages": [{"role": "user", "content": "Summarise: my order #1042 arrived cracked."}]},
)
response.status_code, response.json()["content"][0]["text"]
```

Delete the `x-api-key` header and run it again: you get the 401 the real API sends.

Current Anthropic models include `claude-opus-5-5` (the most capable), `claude-sonnet-5` (the
balance of capability and speed) and `claude-haiku-4-5` (the fastest and cheapest). Model names
change with every release, so they belong in configuration, not scattered through your code.

## The OpenAI Chat Completions API

`POST https://api.openai.com/v1/chat/completions`, with the key as a bearer token:

```python norun
import os

import httpx

http = httpx.Client(base_url="https://api.openai.com", timeout=60)
response = http.post(
    "/v1/chat/completions",
    headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
    json={
        "model": os.environ["OPENAI_MODEL"],
        "max_completion_tokens": 300,
        "messages": [
            {"role": "system", "content": "You summarise support tickets in one sentence."},
            {"role": "user", "content": "My order #1042 arrived with a cracked screen."},
        ],
    },
)
response.raise_for_status()
response.json()["choices"][0]["message"]["content"]
```

The model comes from an `OPENAI_MODEL` environment variable here because OpenAI's line-up changes
often; check their models page for the current names rather than trusting one from a tutorial. The
output limit is optional, and the current name for it is `max_completion_tokens` (the older
`max_tokens` is deprecated and some models reject it).

The reply is wrapped in a list of **choices** (you can ask for several alternatives with `n`, though
you rarely will), and the text is a plain string:

```text
{
  "id": "chatcmpl-9xk2",
  "object": "chat.completion",
  "model": "<the model you asked for>",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "The customer's order #1042 arrived with a cracked screen."},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 33, "completion_tokens": 15, "total_tokens": 48}
}
```

> [!NOTE]
> OpenAI's newer **Responses API** (`POST /v1/responses`) takes `input` instead of `messages` and
> returns a list of output items. It adds server-side conversation state and built-in tools. This
> course teaches Chat Completions because it's the shape most other providers and local model
> servers copy, so an adapter for it reaches furthest. Once your interface exists, a Responses
> adapter is one more class.

> [!JS]
> Coming from JavaScript: the official SDKs (`@anthropic-ai/sdk`, `openai`) wrap exactly these
> requests. Writing them by hand once, as here, is what lets you debug the SDK, or skip it, when a
> request misbehaves.

## Six differences that matter

Everything your adapters do comes down to this table:

| | Anthropic Messages | OpenAI Chat Completions |
|---|---|---|
| Auth | `x-api-key: <key>` plus `anthropic-version: 2023-06-01` | `Authorization: Bearer <key>` |
| System prompt | top-level `"system"` field | first message, `{"role": "system", ...}` |
| Output limit | `max_tokens`, **required** | `max_completion_tokens`, optional |
| Reply text | `content`: a list of blocks, join the `text` ones | `choices[0].message.content`: a string, or `null` |
| Why it stopped | `stop_reason`: `end_turn`, `max_tokens`, `stop_sequence`, `tool_use` | `finish_reason`: `stop`, `length`, `tool_calls`, `content_filter` |
| Usage | `input_tokens`, `output_tokens` | `prompt_tokens`, `completion_tokens`, `total_tokens` |

The stop reason matters more than it looks. `max_tokens` on Anthropic, or `length` on OpenAI, means
the reply was **cut off** mid-sentence. An automation that saves a truncated summary, or tries to
parse truncated JSON, fails in a way nobody notices until a customer does. Always check it.

```quiz
question: An OpenAI reply comes back with finish_reason "length". What does it mean?
options:
  - The reply is complete and was long
  - The reply hit the output-token limit and is cut off
  - The prompt was too long for the context window
answer: 1
explain: "\"length\" (Anthropic: \"max_tokens\") means generation stopped at the limit you set. A prompt that's too long is rejected with a 400 before anything is generated."
```

## Where the system prompt goes

The **system prompt** sets the model's job and rules for the whole conversation: who it's working
for, the tone, what it must never do. Put it in the wrong place and the request fails, or worse,
seems to work.

Anthropic has no `system` role. A system message in the `messages` list is rejected with a 400
("Unexpected role"), so the instructions go in the top-level field:

```python
ticket = "My order #1042 arrived with a cracked screen."
system = "You summarise support tickets in one sentence."

# Wrong for Anthropic: works on OpenAI, rejected with a 400 here
wrong = {"model": "claude-haiku-4-5", "max_tokens": 300, "messages": [
    {"role": "system", "content": system},
    {"role": "user", "content": ticket},
]}

right = {"model": "claude-haiku-4-5", "max_tokens": 300, "system": system, "messages": [
    {"role": "user", "content": ticket},
]}
[m["role"] for m in right["messages"]]
```

On OpenAI it's the other way round: there's no top-level field, and the first message carries it.
Newer OpenAI models also accept `"developer"` as the role name for the same thing. Either way,
both APIs expect the conversation itself to alternate between `user` and `assistant`, starting with
`user`.

## Keys come from the environment

An API key is a password that spends your client's money. It never goes in code, never in a
repository, and never in a log line. Read it from an environment variable at start-up:

```python raises
import os

api_key = os.environ["ANTHROPIC_API_KEY"]
```

This page has no such variable, so it raises `KeyError` straight away, which is what you want: a
missing key should fail at start-up with the variable's name, not later with a confusing 401. On
your machine, set it in your shell (`export ANTHROPIC_API_KEY=...`) or in a `.env` file that's
listed in `.gitignore`; in production, your host's secret store fills it in.

> [!WARNING]
> The easiest way to leak a key is to log a request "for debugging". `log.debug("headers %s",
> headers)` writes the key to every log file, error tracker and screenshot from then on. Log the
> provider, the model and the token counts; never the headers.

## Where this leaves you

Both APIs take a list of messages and return a reply, a stop reason and token counts. They differ in
auth headers, where the system prompt goes, whether the output limit is required, how the reply
text is wrapped, and what they call the stop reasons and usage fields. Keys come from the
environment and never appear in logs. The drills have you call Anthropic with raw httpx, fix a key
sent in the wrong header and a system prompt sent in the wrong place, and read both response shapes
into one.
