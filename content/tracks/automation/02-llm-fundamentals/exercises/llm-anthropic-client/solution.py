from dataclasses import dataclass

import httpx

ANTHROPIC_VERSION = "2023-06-01"


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class LLMResponse:
    text: str
    tool_calls: list[ToolCall]
    stop_reason: str
    usage: Usage
    model: str


def to_anthropic_tool(tool):
    return {"name": tool["name"], "description": tool.get("description", ""), "input_schema": tool["parameters"]}


def to_anthropic_messages(messages):
    """Neutral messages as Anthropic expects them (from the lesson)."""
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


STOP_REASONS = {"stop_sequence": "end_turn"}


class AnthropicClient:
    """The neutral LLM interface over Anthropic's Messages API."""

    def __init__(self, http, *, api_key, model):
        self._http = http
        self._api_key = api_key
        self.model = model

    def __repr__(self):
        return f"AnthropicClient(model={self.model!r})"

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        body = {
            "model": model or self.model,
            "max_tokens": max_tokens,
            "messages": to_anthropic_messages(messages),
        }
        if system:
            body["system"] = system
        if tools:
            body["tools"] = [to_anthropic_tool(tool) for tool in tools]
        if temperature is not None:
            body["temperature"] = temperature

        response = self._http.post(
            "/v1/messages",
            headers={"x-api-key": self._api_key, "anthropic-version": ANTHROPIC_VERSION},
            json=body,
        )
        response.raise_for_status()
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
            stop_reason=STOP_REASONS.get(stop, stop),
            usage=Usage(data["usage"]["input_tokens"], data["usage"]["output_tokens"]),
            model=data["model"],
        )
