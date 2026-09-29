import json
from dataclasses import dataclass


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


def parse_openai_message(message):
    """The text and neutral tool calls in an OpenAI assistant message."""
    text = message.get("content") or ""
    calls = [
        ToolCall(id=call["id"], name=call["function"]["name"], arguments=json.loads(call["function"]["arguments"]))
        for call in message.get("tool_calls") or []
    ]
    return text, calls
