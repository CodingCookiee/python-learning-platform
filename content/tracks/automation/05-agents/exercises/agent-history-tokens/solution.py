import json
import math


def estimate_tokens(text):
    """About four characters per token, rounded up."""
    return math.ceil(len(text) / 4)


def history_tokens(messages: list[dict], *, system: str | None = None) -> int:
    """Estimated input tokens for sending these messages (and the system prompt)."""
    total = estimate_tokens(system) if system else 0
    for message in messages:
        total += estimate_tokens(message.get("content") or "")
        if message.get("tool_calls"):
            total += estimate_tokens(json.dumps(message["tool_calls"]))
    return total
