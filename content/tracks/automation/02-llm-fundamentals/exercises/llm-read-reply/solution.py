ANTHROPIC_STOP = {"stop_sequence": "end_turn"}
OPENAI_STOP = {"stop": "end_turn", "length": "max_tokens", "tool_calls": "tool_use"}


def read_reply(provider, payload):
    """The text, neutral stop reason and token counts from an Anthropic or OpenAI response."""
    if provider == "anthropic":
        stop = payload["stop_reason"]
        return {
            "text": "".join(block["text"] for block in payload["content"] if block["type"] == "text"),
            "stop_reason": ANTHROPIC_STOP.get(stop, stop),
            "input_tokens": payload["usage"]["input_tokens"],
            "output_tokens": payload["usage"]["output_tokens"],
        }
    if provider == "openai":
        choice = payload["choices"][0]
        stop = choice["finish_reason"]
        return {
            "text": choice["message"].get("content") or "",
            "stop_reason": OPENAI_STOP.get(stop, stop),
            "input_tokens": payload["usage"]["prompt_tokens"],
            "output_tokens": payload["usage"]["completion_tokens"],
        }
    raise ValueError(f"Unknown provider {provider!r}: expected 'anthropic' or 'openai'")
