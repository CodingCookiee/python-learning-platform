import json

import httpx

ANTHROPIC_VERSION = "2023-06-01"


def parse_sse(lines):
    """Yield (event, data) for each event in a server-sent event stream (from the last drill)."""
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


def stream_anthropic(http, messages, *, api_key, model, system=None, max_tokens=1024):
    """Yield the reply's text as it arrives from Anthropic's Messages API."""
    body = {"model": model, "max_tokens": max_tokens, "messages": messages, "stream": True}
    if system:
        body["system"] = system
    headers = {"x-api-key": api_key, "anthropic-version": ANTHROPIC_VERSION}
    with http.stream("POST", "/v1/messages", json=body, headers=headers) as response:
        response.raise_for_status()
        for event, data in parse_sse(response.iter_lines()):
            if event != "content_block_delta":
                continue
            delta = json.loads(data)["delta"]
            if delta["type"] == "text_delta":
                yield delta["text"]


def stream_openai(http, messages, *, api_key, model, system=None, max_tokens=1024):
    """Yield the reply's text as it arrives from OpenAI's Chat Completions API."""
    sent = ([{"role": "system", "content": system}] if system else []) + list(messages)
    body = {"model": model, "max_completion_tokens": max_tokens, "messages": sent, "stream": True}
    headers = {"Authorization": f"Bearer {api_key}"}
    with http.stream("POST", "/v1/chat/completions", json=body, headers=headers) as response:
        response.raise_for_status()
        for _, data in parse_sse(response.iter_lines()):
            if data == "[DONE]":
                return
            choices = json.loads(data)["choices"]
            if choices and choices[0]["delta"].get("content"):
                yield choices[0]["delta"]["content"]
