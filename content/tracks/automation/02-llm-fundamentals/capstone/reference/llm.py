"""A provider-neutral LLM client: one complete() interface over Anthropic and OpenAI, with retries."""

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Protocol

import httpx

log = logging.getLogger(__name__)

ANTHROPIC_URL = "https://api.anthropic.com"
OPENAI_URL = "https://api.openai.com"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5"


# The neutral types


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict  # already parsed from JSON


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class LLMResponse:
    text: str  # "" when the model only called tools
    tool_calls: list[ToolCall]
    stop_reason: str  # "end_turn" | "tool_use" | "max_tokens"
    usage: Usage
    model: str


class LLM(Protocol):
    def complete(
        self,
        messages: list[dict],
        *,
        system: str | None = None,
        tools: list[dict] | None = None,
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float | None = None,
    ) -> LLMResponse: ...


# Errors and retries


class LLMError(RuntimeError):
    """A failed LLM call. retryable says whether sending it again could succeed."""

    retryable = False

    def __init__(self, message, *, status=None, retry_after=None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


class AuthenticationError(LLMError):
    """401 or 403: the key is missing, wrong, or not allowed to do this."""


class BadRequestError(LLMError):
    """Any other 4xx: the request itself is wrong. Fix it; don't resend it."""


class RateLimitError(LLMError):
    """429: too many requests or tokens for now."""

    retryable = True


class ServerError(LLMError):
    """5xx, including Anthropic's 529 (overloaded)."""

    retryable = True


class LLMTimeout(LLMError):
    """No response in time, or the connection failed."""

    retryable = True


def error_from_response(response):
    """The LLMError for a failed response from either provider."""
    status = response.status_code
    if status in (401, 403):
        kind = AuthenticationError
    elif status == 429:
        kind = RateLimitError
    elif status >= 500:
        kind = ServerError
    else:
        kind = BadRequestError
    return kind(f"{error_message(response)} (HTTP {status})", status=status, retry_after=retry_after(response))


def error_message(response):
    """The provider's message from the error body, or whatever the body says."""
    try:
        return response.json()["error"]["message"]
    except (ValueError, KeyError, TypeError):
        return response.text.strip() or response.reason_phrase


def retry_after(response):
    """The retry-after header in seconds, or None."""
    try:
        return float(response.headers["retry-after"])
    except (KeyError, ValueError):
        return None


def send_with_retries(send, *, max_attempts=4, base_delay=1.0, max_delay=30.0, sleep=time.sleep):
    """Call send() until it returns a successful response, retrying what can succeed later."""
    for attempt in range(max_attempts):
        try:
            response = send()
        except httpx.TransportError as exc:
            error = LLMTimeout(f"No response from the API: {exc}")
            error.__cause__ = exc
        else:
            if response.is_success:
                return response
            error = error_from_response(response)

        if not error.retryable or attempt == max_attempts - 1:
            raise error
        if error.retry_after is not None:
            delay = error.retry_after
        else:
            delay = min(max_delay, base_delay * 2**attempt)
        log.warning("LLM call failed (%s); retrying in %.1fs (attempt %d of %d)", error, delay, attempt + 2, max_attempts)
        sleep(delay)


# Translations


def to_anthropic_tool(tool):
    return {"name": tool["name"], "description": tool.get("description", ""), "input_schema": tool["parameters"]}


def to_openai_tool(tool):
    return {
        "type": "function",
        "function": {"name": tool["name"], "description": tool.get("description", ""), "parameters": tool["parameters"]},
    }


def to_anthropic_messages(messages):
    """Neutral messages as Anthropic expects them."""
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
            blocks += [
                {"type": "tool_use", "id": call["id"], "name": call["name"], "input": call["arguments"]}
                for call in message["tool_calls"]
            ]
            translated.append({"role": "assistant", "content": blocks})
        else:
            translated.append({"role": message["role"], "content": message["content"]})
    return translated


def to_openai_messages(messages, system=None):
    """Neutral messages (and the system prompt, if any) as OpenAI expects them."""
    translated = [{"role": "system", "content": system}] if system else []
    for message in messages:
        if message["role"] == "assistant" and message.get("tool_calls"):
            translated.append({
                "role": "assistant",
                "content": message.get("content") or None,
                "tool_calls": [
                    {
                        "id": call["id"],
                        "type": "function",
                        "function": {"name": call["name"], "arguments": json.dumps(call["arguments"])},
                    }
                    for call in message["tool_calls"]
                ],
            })
        elif message["role"] == "tool":
            translated.append({"role": "tool", "tool_call_id": message["tool_call_id"], "content": message["content"]})
        else:
            translated.append({"role": message["role"], "content": message["content"]})
    return translated


# The adapters


class AnthropicClient:
    """The neutral LLM interface over Anthropic's Messages API."""

    STOP_REASONS = {"stop_sequence": "end_turn"}

    def __init__(self, http, *, api_key, model, sleep=time.sleep):
        self._http = http
        self._api_key = api_key
        self._sleep = sleep
        self.model = model

    def __repr__(self):
        return f"AnthropicClient(model={self.model!r})"

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        body = {"model": model or self.model, "max_tokens": max_tokens, "messages": to_anthropic_messages(messages)}
        if system:
            body["system"] = system
        if tools:
            body["tools"] = [to_anthropic_tool(tool) for tool in tools]
        if temperature is not None:
            body["temperature"] = temperature

        headers = {"x-api-key": self._api_key, "anthropic-version": ANTHROPIC_VERSION}
        response = send_with_retries(
            lambda: self._http.post("/v1/messages", headers=headers, json=body),
            sleep=self._sleep,
        )
        data = response.json()

        blocks = data["content"]
        stop = data["stop_reason"]
        return LLMResponse(
            text="".join(block["text"] for block in blocks if block["type"] == "text"),
            tool_calls=[
                ToolCall(id=block["id"], name=block["name"], arguments=block["input"])
                for block in blocks
                if block["type"] == "tool_use"
            ],
            stop_reason=self.STOP_REASONS.get(stop, stop),
            usage=Usage(data["usage"]["input_tokens"], data["usage"]["output_tokens"]),
            model=data["model"],
        )


class OpenAIClient:
    """The neutral LLM interface over OpenAI's Chat Completions API."""

    STOP_REASONS = {"stop": "end_turn", "length": "max_tokens", "tool_calls": "tool_use"}

    def __init__(self, http, *, api_key, model, sleep=time.sleep):
        self._http = http
        self._api_key = api_key
        self._sleep = sleep
        self.model = model

    def __repr__(self):
        return f"OpenAIClient(model={self.model!r})"

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        body = {
            "model": model or self.model,
            "max_completion_tokens": max_tokens,
            "messages": to_openai_messages(messages, system),
        }
        if tools:
            body["tools"] = [to_openai_tool(tool) for tool in tools]
        if temperature is not None:
            body["temperature"] = temperature

        headers = {"Authorization": f"Bearer {self._api_key}"}
        response = send_with_retries(
            lambda: self._http.post("/v1/chat/completions", headers=headers, json=body),
            sleep=self._sleep,
        )
        data = response.json()

        choice = data["choices"][0]
        message = choice["message"]
        finish = choice["finish_reason"]
        return LLMResponse(
            text=message.get("content") or "",
            tool_calls=[
                ToolCall(id=call["id"], name=call["function"]["name"], arguments=json.loads(call["function"]["arguments"]))
                for call in message.get("tool_calls") or []
            ],
            stop_reason=self.STOP_REASONS.get(finish, finish),
            usage=Usage(data["usage"]["prompt_tokens"], data["usage"]["completion_tokens"]),
            model=data["model"],
        )


# The factory


def make_llm(env=os.environ, *, http=None):
    """The LLM client that the environment asks for."""
    provider = env.get("LLM_PROVIDER", "anthropic").strip().lower()
    if provider == "anthropic":
        api_key = require(env, "ANTHROPIC_API_KEY")
        model = env.get("ANTHROPIC_MODEL", "").strip() or DEFAULT_ANTHROPIC_MODEL
        client = AnthropicClient(http or httpx.Client(base_url=ANTHROPIC_URL, timeout=60), api_key=api_key, model=model)
    elif provider == "openai":
        api_key = require(env, "OPENAI_API_KEY")
        model = require(env, "OPENAI_MODEL")
        client = OpenAIClient(http or httpx.Client(base_url=OPENAI_URL, timeout=60), api_key=api_key, model=model)
    else:
        raise ValueError(f"LLM_PROVIDER must be 'anthropic' or 'openai', not {provider!r}")
    log.info("Using %s with model %s", provider, model)
    return client


def require(env, name):
    """The value of a required setting. The error names the variable, never a value."""
    value = env.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Set the {name} environment variable")
    return value
