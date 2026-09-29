import json
import math

SUMMARY_PROMPT = (
    "Summarise this support conversation for the agent that continues it. Keep ids, facts found, "
    "what the customer already tried and what's still open. At most 120 words."
)


def estimate_tokens(text):
    return math.ceil(len(text) / 4)


def history_tokens(messages):
    total = 0
    for message in messages:
        total += estimate_tokens(message.get("content") or "")
        if message.get("tool_calls"):
            total += estimate_tokens(json.dumps(message["tool_calls"]))
    return total


def safe_start(messages, keep_last):
    """Where the recent part begins: keep_last from the end, moved past orphaned tool results."""
    start = max(1, len(messages) - keep_last)
    while start < len(messages) and messages[start]["role"] == "tool":
        start += 1
    return start


def transcript(messages):
    """The messages as plain text lines, for the summariser."""
    lines = []
    for message in messages:
        if message["role"] == "tool":
            lines.append(f"tool result: {message['content']}")
            continue
        line = f"{message['role']}: {message.get('content') or ''}"
        for call in message.get("tool_calls") or []:
            line += f" [called {call['name']}({json.dumps(call['arguments'])})]"
        lines.append(line)
    return "\n".join(lines)


def compact(llm, messages: list[dict], *, keep_last: int = 6, max_tokens: int = 3000) -> list[dict]:
    """The history, with everything but the task and the recent messages replaced by a summary."""
    if history_tokens(messages) <= max_tokens:
        return list(messages)
    start = safe_start(messages, keep_last)
    older, recent = messages[1:start], messages[start:]
    prompt = f"{SUMMARY_PROMPT}\n\n<transcript>\n{transcript(older)}\n</transcript>"
    summary = llm.complete([{"role": "user", "content": prompt}], max_tokens=400).text.strip()
    task = messages[0]["content"]
    return [{"role": "user", "content": f"{task}\n\nSummary of the conversation so far:\n{summary}"}, *recent]
