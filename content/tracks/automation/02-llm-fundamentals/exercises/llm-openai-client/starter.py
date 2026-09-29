import json
from dataclasses import dataclass

import httpx


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


def to_openai_tool(tool):
    return {
        "type": "function",
        "function": {"name": tool["name"], "description": tool.get("description", ""), "parameters": tool["parameters"]},
    }


def to_openai_messages(messages, system=None):
    """Neutral messages (and the system prompt, if any) as OpenAI expects them."""
    ...


class OpenAIClient:
    """The neutral LLM interface over OpenAI's Chat Completions API."""

    def __init__(self, http, *, api_key, model):
        ...

    def __repr__(self):
        ...

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        ...
