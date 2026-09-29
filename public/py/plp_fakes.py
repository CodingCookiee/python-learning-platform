"""pylearn fakes for the AI automation track: deterministic, free, offline.

Drill tests use these so grading never needs an API key or the network.

HTTP-level fakes of the real provider APIs (for learners building their own client):
    anthropic_api(replies)  -> FakeProvider   (POST /v1/messages)
    openai_api(replies)     -> FakeProvider   (POST /v1/chat/completions)
    provider.transport      -> an httpx.MockTransport to give their httpx.Client
    provider.requests       -> every request received, parsed (method, path, headers, json)

The course's provider-neutral interface (learners build it in A2; later modules take one):
    ScriptedLLM(replies)    -> .complete(messages, system=, tools=, ...) -> LLMResponse
    LLMResponse, ToolCall, Usage

Other fakes:
    fake_api(routes)        -> FakeServer for any JSON API (Slack, CRM, sheets…)
    fake_embed(texts)       -> deterministic embeddings where shared words mean similarity
    McpHarness(handle)      -> drives a JSON-RPC MCP server function like a client would

A "reply" in a script is one of:
    "some text"                         a plain assistant message
    tool_call("get_order", id="1042")   the model asks to call a tool (or a list of them)
    Reply(text=..., tool_calls=[...], stop_reason=..., usage=...)   full control
    Fail(429, retry_after=2) / Fail(500) / Fail(400, "bad request")  an HTTP error
    callable(request_dict) -> any of the above                     computed per request
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable

__all__ = [
    "ToolCall",
    "Usage",
    "LLMResponse",
    "Reply",
    "Fail",
    "Timeout",
    "FakeLLMError",
    "tool_call",
    "ScriptedLLM",
    "anthropic_api",
    "openai_api",
    "FakeProvider",
    "fake_api",
    "FakeServer",
    "fake_embed",
    "cosine",
    "McpHarness",
    "estimate_tokens",
]


# The course's neutral types


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class LLMResponse:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str = "end_turn"  # end_turn | tool_use | max_tokens
    usage: Usage = field(default_factory=Usage)
    model: str = "fake-model"
    raw: dict = field(default_factory=dict)


@dataclass
class Reply:
    text: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str | None = None
    usage: Usage | None = None


@dataclass
class Fail:
    status: int
    message: str = ""
    retry_after: float | None = None


@dataclass
class Timeout:
    """The request times out: HTTP fakes raise httpx.ReadTimeout, ScriptedLLM raises TimeoutError."""

    message: str = "The read operation timed out"


class FakeLLMError(Exception):
    """What ScriptedLLM raises for a scripted Fail: carries .status and .retry_after."""

    def __init__(self, status: int, message: str = "", retry_after: float | None = None):
        super().__init__(f"Fake LLM error {status}: {message or 'scripted failure'}")
        self.status = status
        self.message = message
        self.retry_after = retry_after


_ids = {"n": 0}


def _next_id(prefix: str) -> str:
    _ids["n"] += 1
    return f"{prefix}_{_ids['n']:04d}"


def tool_call(name: str, **arguments: Any) -> ToolCall:
    """A tool call the fake model makes: tool_call("get_order", order_id="1042")."""
    return ToolCall(id=_next_id("call"), name=name, arguments=arguments)


def estimate_tokens(text: str) -> int:
    """Roughly 4 characters per token, the usual rule of thumb (at least 1 for non-empty text)."""
    return max(1, math.ceil(len(text) / 4)) if text else 0


def _as_reply(item: Any) -> Reply | Fail | Timeout:
    if isinstance(item, (Reply, Fail, Timeout)):
        return item
    if isinstance(item, str):
        return Reply(text=item)
    if isinstance(item, ToolCall):
        return Reply(tool_calls=[item])
    if isinstance(item, list) and all(isinstance(t, ToolCall) for t in item):
        return Reply(tool_calls=list(item))
    raise TypeError(f"Unknown fake reply: {item!r}")


class _Script:
    def __init__(self, replies: Iterable[Any], name: str):
        self._items = list(replies)
        self._name = name
        self.used = 0

    def next(self, request: dict) -> Reply | Fail | Timeout:
        if self.used >= len(self._items):
            raise AssertionError(
                f"{self._name} was called {self.used + 1} times, but the test only scripted "
                f"{len(self._items)} {'reply' if len(self._items) == 1 else 'replies'}"
            )
        item = self._items[self.used]
        self.used += 1
        if callable(item) and not isinstance(item, (ToolCall, Reply, Fail, Timeout)):
            item = item(request)
        return _as_reply(item)


def _messages_text(messages: list[dict]) -> str:
    parts = []
    for m in messages:
        content = m.get("content", "")
        if isinstance(content, str):
            parts.append(content)
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict):
                    parts.append(str(block.get("text") or block.get("content") or block.get("input") or ""))
    return "\n".join(parts)


# The neutral interface, scripted


class ScriptedLLM:
    """A fake of the course's provider-neutral LLM client.

        llm = ScriptedLLM([tool_call("get_order", order_id="1042"), "Your order ships today."])
        agent = SupportAgent(llm)
        ...
        assert llm.calls[1]["messages"][-1]["role"] == "tool"

    .calls holds the keyword arguments of every complete() call (messages copied),
    so tests can check prompts, tools offered and conversation history.
    """

    def __init__(self, replies: Iterable[Any], *, model: str = "fake-model", supports_schema: bool = True):
        """supports_schema=False makes complete(..., schema=...) raise NotImplementedError,
        like a client for a provider without native structured outputs."""
        self._script = _Script(replies, "ScriptedLLM")
        self.model = model
        self.supports_schema = supports_schema
        self.calls: list[dict] = []

    def complete(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[dict] | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float | None = None,
        **extra: Any,
    ) -> LLMResponse:
        call = {
            "messages": json.loads(json.dumps(messages, default=str)),
            "system": system,
            "tools": tools,
            "model": model or self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            **extra,
        }
        self.calls.append(call)
        if extra.get("schema") is not None and not self.supports_schema:
            raise NotImplementedError("This fake client doesn't support native structured output (schema=)")
        reply = self._script.next(call)
        if isinstance(reply, Fail):
            raise FakeLLMError(reply.status, reply.message, reply.retry_after)
        if isinstance(reply, Timeout):
            raise TimeoutError(reply.message)
        usage = reply.usage or Usage(
            input_tokens=estimate_tokens((system or "") + _messages_text(messages)),
            output_tokens=estimate_tokens(reply.text) + 10 * len(reply.tool_calls),
        )
        stop = reply.stop_reason or ("tool_use" if reply.tool_calls else "end_turn")
        return LLMResponse(
            text=reply.text,
            tool_calls=list(reply.tool_calls),
            stop_reason=stop,
            usage=usage,
            model=model or self.model,
        )

    @property
    def remaining(self) -> int:
        return len(self._script._items) - self._script.used


# HTTP-level fakes of the real APIs


class _Recorded(dict):
    """A request as the fake server saw it: method, path, query, headers, json."""

    @property
    def json(self) -> Any:  # type: ignore[override]
        return self["json"]


class FakeServer:
    """A fake JSON API. Routes map "METHOD /path" (with {params}) to a handler or a value:

        server = fake_api({
            "POST /api/chat.postMessage": {"ok": True, "ts": "1712.01"},
            "GET /v1/contacts/{id}": lambda req, id: {"id": id, "name": "Ada"},
            "GET /v1/deals": lambda req: (200, {"deals": []}, {"X-Next": "abc"}),
        })
        client = httpx.Client(transport=server.transport, base_url="https://api.example.com")

    A handler returns a JSON value (status 200), or (status, json) / (status, json, headers),
    or Timeout() to make the request time out. Unknown routes get 404. .requests records
    everything received (including the client's timeout settings under "timeout");
    .calls(route) filters them.
    """

    def __init__(self, routes: dict[str, Any]):
        self._routes = []
        for key, value in routes.items():
            method, _, pattern = key.partition(" ")
            names = re.findall(r"{(\w+)}", pattern)
            regex = "^" + re.sub(r"{\w+}", r"([^/]+)", re.escape(pattern).replace(r"\{", "{").replace(r"\}", "}")) + "$"
            self._routes.append((method.upper(), re.compile(regex), names, value, key))
        self.requests: list[_Recorded] = []

    def _record(self, request) -> _Recorded:
        body = request.content.decode("utf8") if request.content else ""
        try:
            parsed = json.loads(body) if body else None
        except ValueError:
            parsed = None
        rec = _Recorded(
            method=request.method,
            path=request.url.path,
            query=dict(request.url.params),
            headers={k.lower(): v for k, v in request.headers.items()},
            body=body,
            json=parsed,
            timeout=request.extensions.get("timeout"),
        )
        self.requests.append(rec)
        return rec

    def calls(self, route: str) -> list[_Recorded]:
        method, _, path = route.partition(" ")
        return [r for r in self.requests if r["method"] == method.upper() and r["path"] == path]

    def handle(self, request):
        import httpx

        rec = self._record(request)
        for method, regex, names, value, _key in self._routes:
            m = regex.match(rec["path"])
            if method != rec["method"] or not m:
                continue
            result = value(rec, **dict(zip(names, m.groups()))) if callable(value) else value
            if isinstance(result, Timeout):
                raise httpx.ReadTimeout(result.message, request=request)
            status, payload, headers = 200, result, {}
            if isinstance(result, tuple):
                status, payload, *rest = result
                headers = rest[0] if rest else {}
            if isinstance(payload, httpx.Response):
                return payload
            return httpx.Response(status, json=payload, headers=headers)
        return httpx.Response(404, json={"error": f"no route for {rec['method']} {rec['path']}"})

    @property
    def transport(self):
        import httpx

        return httpx.MockTransport(self.handle)

    @property
    def async_transport(self):
        import httpx

        async def handler(request):
            await request.aread()
            return self.handle(request)

        return httpx.MockTransport(handler)


def fake_api(routes: dict[str, Any]) -> FakeServer:
    return FakeServer(routes)


class FakeProvider:
    """A fake of one LLM provider's HTTP API, answering from a script."""

    def __init__(self, kind: str, replies: Iterable[Any], *, model: str):
        self.kind = kind
        self.model = model
        self._script = _Script(replies, f"The fake {kind} API")
        self.requests: list[_Recorded] = []

    # Recording

    def _record(self, request) -> _Recorded:
        body = request.content.decode("utf8") if request.content else ""
        try:
            parsed = json.loads(body) if body else None
        except ValueError:
            parsed = None
        rec = _Recorded(
            method=request.method,
            path=request.url.path,
            query=dict(request.url.params),
            headers={k.lower(): v for k, v in request.headers.items()},
            body=body,
            json=parsed,
        )
        self.requests.append(rec)
        return rec

    @property
    def last(self) -> _Recorded:
        if not self.requests:
            raise AssertionError(f"The fake {self.kind} API received no requests")
        return self.requests[-1]

    # Handling

    def handle(self, request):
        import httpx

        rec = self._record(request)
        expected_path = "/v1/messages" if self.kind == "anthropic" else "/v1/chat/completions"
        if rec["method"] != "POST" or rec["path"] != expected_path:
            return httpx.Response(404, json=self._error("not_found_error", f"Unknown endpoint {rec['method']} {rec['path']}"))
        auth_error = self._check_auth(rec)
        if auth_error:
            return httpx.Response(401, json=self._error("authentication_error", auth_error))
        body = rec["json"]
        if not isinstance(body, dict) or not body.get("messages") or not body.get("model"):
            return httpx.Response(400, json=self._error("invalid_request_error", "model and messages are required"))
        if self.kind == "anthropic" and "max_tokens" not in body:
            return httpx.Response(400, json=self._error("invalid_request_error", "max_tokens: Field required"))
        if self.kind == "anthropic" and any(m.get("role") == "system" for m in body["messages"] if isinstance(m, dict)):
            return httpx.Response(
                400,
                json=self._error(
                    "invalid_request_error",
                    'messages: Unexpected role "system". The Messages API accepts a top-level `system` parameter, not "system" as an input message role.',
                ),
            )

        reply = self._script.next(body)
        if isinstance(reply, Timeout):
            raise httpx.ReadTimeout(reply.message, request=request)
        if isinstance(reply, Fail):
            headers = {"retry-after": str(reply.retry_after)} if reply.retry_after is not None else {}
            kind = {429: "rate_limit_error", 529: "overloaded_error", 400: "invalid_request_error"}.get(reply.status, "api_error")
            return httpx.Response(reply.status, json=self._error(kind, reply.message or f"Error {reply.status}"), headers=headers)

        system = body.get("system") or ""
        if isinstance(system, list):
            system = " ".join(str(b.get("text", "")) for b in system if isinstance(b, dict))
        usage = reply.usage or Usage(
            input_tokens=estimate_tokens(str(system) + _messages_text(body["messages"])),
            output_tokens=estimate_tokens(reply.text) + 10 * len(reply.tool_calls),
        )
        model = body.get("model", self.model)
        if body.get("stream"):
            include_usage = bool((body.get("stream_options") or {}).get("include_usage"))
            return httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=self._sse(reply, usage, model, include_usage=include_usage),
            )
        payload = self._anthropic(reply, usage, model) if self.kind == "anthropic" else self._openai(reply, usage, model)
        return httpx.Response(200, json=payload)

    def _check_auth(self, rec: _Recorded) -> str | None:
        h = rec["headers"]
        if self.kind == "anthropic":
            if not h.get("x-api-key"):
                return "x-api-key header is required"
            if not h.get("anthropic-version"):
                return "anthropic-version header is required"
            return None
        auth = h.get("authorization", "")
        if not auth.startswith("Bearer ") or len(auth) <= len("Bearer "):
            return "Authorization: Bearer <key> header is required"
        return None

    def _error(self, kind: str, message: str) -> dict:
        if self.kind == "anthropic":
            return {"type": "error", "error": {"type": kind, "message": message}}
        return {"error": {"type": kind, "message": message, "code": None}}

    def _anthropic(self, reply: Reply, usage: Usage, model: str) -> dict:
        content: list[dict] = []
        if reply.text:
            content.append({"type": "text", "text": reply.text})
        for tc in reply.tool_calls:
            content.append({"type": "tool_use", "id": tc.id, "name": tc.name, "input": tc.arguments})
        stop = reply.stop_reason or ("tool_use" if reply.tool_calls else "end_turn")
        return {
            "id": _next_id("msg"),
            "type": "message",
            "role": "assistant",
            "model": model,
            "content": content,
            "stop_reason": stop,
            "stop_sequence": None,
            "usage": {"input_tokens": usage.input_tokens, "output_tokens": usage.output_tokens},
        }

    def _openai(self, reply: Reply, usage: Usage, model: str) -> dict:
        message: dict[str, Any] = {"role": "assistant", "content": reply.text or None}
        if reply.tool_calls:
            message["tool_calls"] = [
                {"id": tc.id, "type": "function", "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)}}
                for tc in reply.tool_calls
            ]
        stop = {"end_turn": "stop", "tool_use": "tool_calls", "max_tokens": "length"}.get(
            reply.stop_reason or ("tool_use" if reply.tool_calls else "end_turn"), "stop"
        )
        return {
            "id": _next_id("chatcmpl"),
            "object": "chat.completion",
            "model": model,
            "choices": [{"index": 0, "message": message, "finish_reason": stop}],
            "usage": {
                "prompt_tokens": usage.input_tokens,
                "completion_tokens": usage.output_tokens,
                "total_tokens": usage.total_tokens,
            },
        }

    def _sse(self, reply: Reply, usage: Usage, model: str, *, include_usage: bool = False) -> bytes:
        """Server-sent events shaped like each provider's stream, including tool calls
        (Anthropic tool_use blocks with input_json_delta; OpenAI tool_calls deltas)."""
        chunks = [reply.text[i : i + 12] for i in range(0, len(reply.text), 12)] if reply.text else []
        stop = reply.stop_reason or ("tool_use" if reply.tool_calls else "end_turn")
        lines: list[str] = []
        if self.kind == "anthropic":

            def event(name: str, data: dict) -> None:
                lines.append(f"event: {name}\ndata: {json.dumps(data)}\n\n")

            event("message_start", {"type": "message_start", "message": {**self._anthropic(Reply(), Usage(usage.input_tokens, 0), model), "content": [], "stop_reason": None}})
            event("ping", {"type": "ping"})
            index = 0
            if chunks:
                event("content_block_start", {"type": "content_block_start", "index": index, "content_block": {"type": "text", "text": ""}})
                for piece in chunks:
                    event("content_block_delta", {"type": "content_block_delta", "index": index, "delta": {"type": "text_delta", "text": piece}})
                event("content_block_stop", {"type": "content_block_stop", "index": index})
                index += 1
            for tc in reply.tool_calls:
                event("content_block_start", {"type": "content_block_start", "index": index, "content_block": {"type": "tool_use", "id": tc.id, "name": tc.name, "input": {}}})
                raw = json.dumps(tc.arguments)
                for i in range(0, len(raw), 10):
                    event("content_block_delta", {"type": "content_block_delta", "index": index, "delta": {"type": "input_json_delta", "partial_json": raw[i : i + 10]}})
                event("content_block_stop", {"type": "content_block_stop", "index": index})
                index += 1
            event("message_delta", {"type": "message_delta", "delta": {"stop_reason": stop, "stop_sequence": None}, "usage": {"output_tokens": usage.output_tokens}})
            event("message_stop", {"type": "message_stop"})
        else:
            base = {"id": _next_id("chatcmpl"), "object": "chat.completion.chunk", "model": model}

            def chunk(delta: dict, finish: str | None = None, **extra: Any) -> None:
                choice: dict[str, Any] = {"index": 0, "delta": delta}
                if finish is not None:
                    choice["finish_reason"] = finish
                lines.append(f"data: {json.dumps({**base, 'choices': [choice], **extra})}\n\n")

            chunk({"role": "assistant", "content": ""})
            for piece in chunks:
                chunk({"content": piece})
            for i, tc in enumerate(reply.tool_calls):
                raw = json.dumps(tc.arguments)
                chunk({"tool_calls": [{"index": i, "id": tc.id, "type": "function", "function": {"name": tc.name, "arguments": ""}}]})
                for j in range(0, len(raw), 10):
                    chunk({"tool_calls": [{"index": i, "function": {"arguments": raw[j : j + 10]}}]})
            finish = {"end_turn": "stop", "tool_use": "tool_calls", "max_tokens": "length"}.get(stop, "stop")
            chunk({}, finish)
            if include_usage:
                lines.append(
                    f"data: {json.dumps({**base, 'choices': [], 'usage': {'prompt_tokens': usage.input_tokens, 'completion_tokens': usage.output_tokens, 'total_tokens': usage.total_tokens}})}\n\n"
                )
            lines.append("data: [DONE]\n\n")
        return "".join(lines).encode("utf8")

    @property
    def transport(self):
        import httpx

        return httpx.MockTransport(self.handle)

    @property
    def async_transport(self):
        import httpx

        async def handler(request):
            await request.aread()
            return self.handle(request)

        return httpx.MockTransport(handler)

    @property
    def remaining(self) -> int:
        return len(self._script._items) - self._script.used


def anthropic_api(replies: Iterable[Any], *, model: str = "claude-fake") -> FakeProvider:
    """A fake of Anthropic's Messages API (POST https://api.anthropic.com/v1/messages).
    Checks the x-api-key and anthropic-version headers and max_tokens, like the real one."""
    return FakeProvider("anthropic", replies, model=model)


def openai_api(replies: Iterable[Any], *, model: str = "gpt-fake") -> FakeProvider:
    """A fake of OpenAI's Chat Completions API (POST https://api.openai.com/v1/chat/completions).
    Checks the Authorization: Bearer header, like the real one."""
    return FakeProvider("openai", replies, model=model)


# Embeddings


_WORD = re.compile(r"[a-z0-9]+")
_STOP = frozenset("a an and are as at be by for from has have i in is it its of on or that the this to was we were will with you your".split())


def _stem(word: str) -> str:
    for suffix in ("ing", "ed", "es", "s"):
        if len(word) > len(suffix) + 2 and word.endswith(suffix):
            return word[: -len(suffix)]
    return word


def fake_embed(texts: Iterable[str] | str, *, dim: int = 64) -> list[list[float]]:
    """Deterministic embeddings: texts that share (stemmed, non-stop) words point in
    similar directions, so retrieval code can be tested without a model.

        [a, b] = fake_embed(["refund my order", "how do refunds work"])
        cosine(a, b) > cosine(a, fake_embed("office opening hours")[0])
    """
    if isinstance(texts, str):
        texts = [texts]
    vectors = []
    for text in texts:
        v = [0.0] * dim
        for word in _WORD.findall(text.lower()):
            if word in _STOP:
                continue
            digest = hashlib.sha256(_stem(word).encode()).digest()
            for k in range(3):  # each word nudges three dimensions
                v[digest[k] % dim] += 1.0 if digest[k + 3] % 2 else -1.0
        norm = math.sqrt(sum(x * x for x in v)) or 1.0
        vectors.append([x / norm for x in v])
    return vectors


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


# MCP


class McpHarness:
    """Drive an MCP server's message handler the way a client would.

    The server under test is a function handle(message: dict) -> dict | None that takes
    one JSON-RPC 2.0 message and returns the response (None for notifications):

        client = McpHarness(handle)
        client.initialize()
        assert [t["name"] for t in client.list_tools()] == ["get_order"]
        result = client.call_tool("get_order", {"order_id": "1042"})

    .log keeps every (request, response) pair.
    """

    def __init__(self, handle: Callable[[dict], dict | None]):
        self._handle = handle
        self._next = 0
        self.log: list[tuple[dict, dict | None]] = []
        self.server_info: dict | None = None

    def request(self, method: str, params: dict | None = None) -> dict:
        self._next += 1
        message = {"jsonrpc": "2.0", "id": self._next, "method": method}
        if params is not None:
            message["params"] = params
        response = self._handle(json.loads(json.dumps(message)))
        self.log.append((message, response))
        if not isinstance(response, dict):
            raise AssertionError(f"{method} should get a JSON-RPC response, got {response!r}")
        if response.get("jsonrpc") != "2.0" or response.get("id") != self._next:
            raise AssertionError(f"{method}: the response must echo jsonrpc '2.0' and id {self._next}, got {response!r}")
        return response

    def notify(self, method: str, params: dict | None = None) -> None:
        message = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            message["params"] = params
        response = self._handle(message)
        self.log.append((message, response))
        if response is not None:
            raise AssertionError(f"Notifications ({method}) must not get a response, got {response!r}")

    def _result(self, method: str, params: dict | None = None) -> Any:
        response = self.request(method, params)
        if "error" in response:
            raise AssertionError(f"{method} returned an error: {response['error']}")
        return response.get("result")

    def initialize(self, protocol_version: str = "2025-06-18") -> dict:
        result = self._result(
            "initialize",
            {"protocolVersion": protocol_version, "capabilities": {}, "clientInfo": {"name": "pylearn-test", "version": "1.0"}},
        )
        self.server_info = result
        self.notify("notifications/initialized")
        return result

    def list_tools(self) -> list[dict]:
        return self._result("tools/list", {}).get("tools", [])

    def call_tool(self, name: str, arguments: dict | None = None) -> dict:
        return self._result("tools/call", {"name": name, "arguments": arguments or {}})

    def list_resources(self) -> list[dict]:
        return self._result("resources/list", {}).get("resources", [])

    def read_resource(self, uri: str) -> dict:
        return self._result("resources/read", {"uri": uri})
