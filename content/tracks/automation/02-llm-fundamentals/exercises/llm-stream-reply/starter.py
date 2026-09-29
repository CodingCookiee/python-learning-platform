import json
from dataclasses import dataclass

import httpx

ANTHROPIC_VERSION = "2023-06-01"


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


def parse_sse(lines):
    """Yield (event, data) for each event in a server-sent event stream."""
    event, data = None, []
    for line in lines:
        if line == "":
            if data:
                yield event, "\n".join(data)
            event, data = None, []
            continue
        if line.startswith(":"):
            continue
        field, _, value = line.partition(":")
        value = value.removeprefix(" ")
        if field == "event":
            event = value
        elif field == "data":
            data.append(value)
    if data:
        yield event, "\n".join(data)


def stream_reply(http, messages, *, api_key, model, on_delta, system=None, max_tokens=1024):
    """Stream a reply from Anthropic, passing each text delta to on_delta, and return the LLMResponse."""
    ...
