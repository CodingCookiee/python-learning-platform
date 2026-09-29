import json
from dataclasses import dataclass, field

TAKE_NOTE = {
    "name": "take_note",
    "description": "Save a fact you'll need for the final answer. Your notes are shown to you on every step.",
    "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]},
}
FINISH = {
    "name": "finish",
    "description": "Call this once, with the finished brief.",
    "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]},
}


@dataclass
class NotesResult:
    answer: str | None
    notes: list[str] = field(default_factory=list)
    steps: int = 0


def trim_history(messages, *, keep_last):
    """The task plus the last keep_last messages, never starting on an orphaned tool result."""
    if len(messages) <= keep_last + 1:
        return list(messages)
    start = len(messages) - keep_last
    while start < len(messages) and messages[start]["role"] == "tool":
        start += 1
    return [messages[0]] + messages[start:]


def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}


def run_with_notes(llm, task, tools, registry, *, system, max_steps=8, keep_last=4):
    """The agent loop, with a scratchpad of notes that survives history trimming."""
    ...
