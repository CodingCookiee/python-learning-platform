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
    ...


def stream_openai(http, messages, *, api_key, model, system=None, max_tokens=1024):
    """Yield the reply's text as it arrives from OpenAI's Chat Completions API."""
    ...
