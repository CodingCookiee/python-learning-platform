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


class AnthropicClient:
    """The neutral LLM interface over Anthropic's Messages API."""

    def __init__(self, http, *, api_key, model):
        ...

    def __repr__(self):
        ...

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        ...
