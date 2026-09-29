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
    body = {"model": model, "max_tokens": max_tokens, "messages": messages, "stream": True}
    if system:
        body["system"] = system
    headers = {"x-api-key": api_key, "anthropic-version": ANTHROPIC_VERSION}

    pieces = []
    reported_model, stop_reason = model, "end_turn"
    input_tokens = output_tokens = 0
    with http.stream("POST", "/v1/messages", json=body, headers=headers) as response:
        response.raise_for_status()
        for event, data in parse_sse(response.iter_lines()):
            payload = json.loads(data)
            if event == "message_start":
                message = payload["message"]
                reported_model = message.get("model", model)
                input_tokens = message["usage"]["input_tokens"]
            elif event == "content_block_delta" and payload["delta"]["type"] == "text_delta":
                pieces.append(payload["delta"]["text"])
                on_delta(payload["delta"]["text"])
            elif event == "message_delta":
                stop_reason = payload["delta"].get("stop_reason") or stop_reason
                output_tokens = payload["usage"]["output_tokens"]
            elif event == "error":
                raise RuntimeError(f"The stream failed: {payload['error']['message']}")
            elif event == "message_stop":
                break

    if stop_reason == "stop_sequence":
        stop_reason = "end_turn"
    return LLMResponse("".join(pieces), [], stop_reason, Usage(input_tokens, output_tokens), reported_model)
