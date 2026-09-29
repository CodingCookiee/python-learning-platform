---
slug: llm-neutral-client
title: A provider-neutral client
summary: One complete() interface, a Protocol that names it, an adapter per provider over httpx, and a factory that picks one from the environment.
minutes: 55
exercises:
  - llm-neutral-tools
  - llm-fix-openai-arguments
  - llm-anthropic-client
  - llm-openai-client
  - llm-client-factory
---

You now know both APIs well enough to see the trap: if your ticket summariser builds Anthropic JSON
and your lead classifier builds OpenAI JSON, switching providers means rewriting both, and testing
either means a network. The fix is the same one module 9 used for payment gateways. Write your
automations against a small interface you own, and put each provider behind an **adapter** that
translates to and from it. This lesson builds that client. Every later module in this track takes an
object with exactly this interface, so the rest of the course can be tested with a scripted fake.

## One interface for every provider

Three dataclasses carry a reply, whichever provider sent it, and a `Protocol` names the one method
every client has:

```python
from dataclasses import dataclass
from typing import Protocol


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict            # already parsed from JSON


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class LLMResponse:
    text: str                  # "" when the model only called tools
    tool_calls: list[ToolCall]
    stop_reason: str           # "end_turn" | "tool_use" | "max_tokens"
    usage: Usage
    model: str


class LLM(Protocol):
    def complete(self, messages: list[dict], *, system: str | None = None,
                 tools: list[dict] | None = None, model: str | None = None,
                 max_tokens: int = 1024, temperature: float | None = None) -> LLMResponse: ...


class CannedLLM:
    """Always gives the same answer: enough to run code that takes an LLM."""

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        return LLMResponse("Cracked screen on #1042.", [], "end_turn", Usage(40, 8), model or "canned")


def summarise(llm: LLM, ticket: str) -> str:
    reply = llm.complete([{"role": "user", "content": ticket}], system="Summarise in one line.", max_tokens=100)
    return reply.text


summarise(CannedLLM(), "Order #1042 arrived with a cracked screen.")
```

`summarise` doesn't know or care which class it's given. Anything with a matching `complete` method
satisfies `LLM`, without inheriting from it: an Anthropic adapter, an OpenAI adapter, or the
`ScriptedLLM` fake the drills in later modules use. The keyword-only arguments after `*` keep calls
readable: `complete(messages, system=..., max_tokens=...)` can't be called with the arguments in the
wrong order.

> [!JS]
> Coming from TypeScript: `LLM` is an `interface`, checked structurally by mypy the way `tsc` checks
> yours. The dataclasses are the typed response objects an SDK gives you, except you own them.

## Neutral messages and tools

Messages are plain dicts in one format of your choosing, and the adapters translate them. The course
uses three shapes:

```python norun
{"role": "user", "content": "Where is order #1042?"}
{"role": "assistant", "content": "", "tool_calls": [{"id": "call_1", "name": "lookup_order", "arguments": {"order_id": "1042"}}]}
{"role": "tool", "tool_call_id": "call_1", "content": "{\"status\": \"shipped\"}"}
```

A **tool** is a function the model may ask you to call (module A3 is all about them). Neutrally it's
a name, a description and a JSON schema for its arguments:
`{"name": "lookup_order", "description": "...", "parameters": {"type": "object", ...}}`. Each
provider spells all of this differently:

| Neutral | Anthropic | OpenAI |
|---------|-----------|--------|
| a tool's `parameters` | `input_schema` | wrapped: `{"type": "function", "function": {"name", "description", "parameters"}}` |
| assistant `tool_calls` | `tool_use` blocks in `content`, with `input` as a dict | `tool_calls`, with `arguments` as a **JSON string** |
| a `tool` message | a `tool_result` block inside a **user** message | a `tool` message, as is |

Here is the Anthropic translation. Consecutive tool results go into one user message, because
Anthropic wants the results of a turn's tool calls together:

```python
def to_anthropic_messages(messages):
    translated = []
    for message in messages:
        if message["role"] == "tool":
            block = {"type": "tool_result", "tool_use_id": message["tool_call_id"], "content": message["content"]}
            previous = translated[-1] if translated else None
            if previous and previous["role"] == "user" and isinstance(previous["content"], list):
                previous["content"].append(block)
            else:
                translated.append({"role": "user", "content": [block]})
        elif message["role"] == "assistant" and message.get("tool_calls"):
            blocks = [{"type": "text", "text": message["content"]}] if message.get("content") else []
            blocks += [{"type": "tool_use", "id": call["id"], "name": call["name"], "input": call["arguments"]}
                       for call in message["tool_calls"]]
            translated.append({"role": "assistant", "content": blocks})
        else:
            translated.append({"role": message["role"], "content": message["content"]})
    return translated


history = [
    {"role": "user", "content": "Where is order #1042?"},
    {"role": "assistant", "content": "", "tool_calls": [{"id": "call_1", "name": "lookup_order", "arguments": {"order_id": "1042"}}]},
    {"role": "tool", "tool_call_id": "call_1", "content": '{"status": "shipped"}'},
]
[(m["role"], m["content"] if isinstance(m["content"], str) else [b["type"] for b in m["content"]])
 for m in to_anthropic_messages(history)]
```

## The Anthropic adapter

An adapter takes three things from outside: an `httpx.Client` (so tests can inject a fake transport
and production can set timeouts and connection limits), the API key, and a default model. It
translates the call, posts it, and translates the reply back:

```python
import json
from dataclasses import dataclass

import httpx


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class LLMResponse:
    text: str
    tool_calls: list
    stop_reason: str
    usage: Usage
    model: str


class AnthropicClient:
    def __init__(self, http: httpx.Client, *, api_key: str, model: str):
        self._http = http
        self._api_key = api_key
        self.model = model

    def __repr__(self):
        return f"AnthropicClient(model={self.model!r})"   # never the key

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        body = {"model": model or self.model, "max_tokens": max_tokens, "messages": messages}
        if system:
            body["system"] = system
        response = self._http.post(
            "/v1/messages",
            headers={"x-api-key": self._api_key, "anthropic-version": "2023-06-01"},
            json=body,
        )
        response.raise_for_status()
        data = response.json()
        text = "".join(block["text"] for block in data["content"] if block["type"] == "text")
        usage = Usage(data["usage"]["input_tokens"], data["usage"]["output_tokens"])
        return LLMResponse(text, [], data["stop_reason"], usage, data["model"])


def fake_anthropic(request):
    body = json.loads(request.content)
    return httpx.Response(200, json={
        "model": body["model"], "stop_reason": "end_turn",
        "content": [{"type": "text", "text": f"({len(body['messages'])} message, system: {'system' in body})"}],
        "usage": {"input_tokens": 25, "output_tokens": 9},
    })


http = httpx.Client(transport=httpx.MockTransport(fake_anthropic), base_url="https://api.anthropic.com")
claude = AnthropicClient(http, api_key="test-key", model="claude-haiku-4-5")
claude, claude.complete([{"role": "user", "content": "Summarise ticket #88"}], system="Be brief.")
```

That version handles plain text only. The drill completes it: tools, temperature (sent only when
it's given, since some models reject it), tool calls in the reply, and the translated history.

In production, the only change is where the client and key come from:

```python norun
import os

http = httpx.Client(base_url="https://api.anthropic.com", timeout=60)
claude = AnthropicClient(http, api_key=os.environ["ANTHROPIC_API_KEY"], model="claude-sonnet-5")
```

## The OpenAI adapter, and the JSON string trap

The OpenAI adapter has the same shape, and its translation follows the table: the system prompt
becomes the first message, `max_tokens` is sent as `max_completion_tokens`, tools are wrapped, and
`finish_reason` is mapped to the neutral stop reasons (`stop` → `end_turn`, `length` →
`max_tokens`, `tool_calls` → `tool_use`).

One detail breaks more OpenAI integrations than any other. A tool call's `arguments` is not a dict:
it's a string of JSON the model wrote. Code that treats it as a dict fails the first time a tool is
called:

```python raises
message = {
    "role": "assistant",
    "content": None,
    "tool_calls": [{"id": "call_1", "type": "function",
                    "function": {"name": "lookup_order", "arguments": "{\"order_id\": \"1042\"}"}}],
}
call = message["tool_calls"][0]["function"]
call["arguments"]["order_id"]
```

`json.loads(call["arguments"])` gives the dict your neutral `ToolCall` promises. Going the other way,
an assistant message with tool calls must be sent back with `json.dumps(arguments)`. Notice also
that `content` is `None` when the model only called tools: the neutral `text` is `""`, never `None`.

```quiz
question: Which of these belongs in the OpenAI adapter, not in the code that uses the client?
options:
  - Deciding what to do when a lead is classified as "hot"
  - Turning finish_reason "length" into stop_reason "max_tokens"
  - Choosing the wording of the lead-scoring prompt
answer: 1
explain: "The adapter's only job is translation between the neutral format and one provider. Prompts and business decisions live in the automation, which then works unchanged on either provider."
```

## Choosing a provider from configuration

Which provider and model to use is deployment configuration, like a database URL. A factory reads
it from the environment and returns an `LLM`, so the rest of the code never names a provider:

```python norun
import os

import httpx


def make_llm(env=os.environ, *, http=None):
    provider = env.get("LLM_PROVIDER", "anthropic")
    if provider == "anthropic":
        http = http or httpx.Client(base_url="https://api.anthropic.com", timeout=60)
        return AnthropicClient(http, api_key=env["ANTHROPIC_API_KEY"], model=env.get("ANTHROPIC_MODEL", "claude-haiku-4-5"))
    if provider == "openai":
        http = http or httpx.Client(base_url="https://api.openai.com", timeout=60)
        return OpenAIClient(http, api_key=env["OPENAI_API_KEY"], model=env["OPENAI_MODEL"])
    raise ValueError(f"LLM_PROVIDER must be 'anthropic' or 'openai', not {provider!r}")


llm = make_llm()
```

Taking `env` as a parameter, defaulting to `os.environ`, is what makes it testable: a test passes a
plain dict. Taking `http` lets a test inject a fake transport. The drill adds clear errors for a
missing key or model.

## Keys stay secret

The adapter holds the key in a private attribute and nothing else ever sees it:

- **`__repr__` leaves it out.** A client shows up in tracebacks, debugger panes and log lines like
  `"using %r"`. A dataclass would print every field, which is why the adapters are plain classes.
- **Log decisions, not requests.** "Using anthropic, model claude-haiku-4-5" is useful; headers are a
  leak.
- **Fail early and name the variable.** A missing key should stop start-up with "Set
  ANTHROPIC_API_KEY", never with a message that includes whatever *was* found.

```python
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s", stream=sys.stdout, force=True)
log = logging.getLogger("llm")


class AnthropicClient:
    def __init__(self, http, *, api_key, model):
        self._http, self._api_key, self.model = http, api_key, model

    def __repr__(self):
        return f"AnthropicClient(model={self.model!r})"


client = AnthropicClient(None, api_key="sk-ant-secret-value", model="claude-haiku-4-5")
log.info("LLM ready: %r", client)
```

## Where this leaves you

Automations take an `LLM`: anything with `complete(messages, *, system, tools, model, max_tokens,
temperature)` returning an `LLMResponse`. Two adapters translate the neutral messages and tools to
each provider and the reply back, over an injected `httpx.Client`, and a factory picks one from the
environment without ever showing the key. In the drills you translate tools, fix OpenAI arguments
that were never parsed, finish both adapters, and write the factory. Keep your solutions: together
they're the `llm.py` module that the capstone, and the rest of the track, builds on.
