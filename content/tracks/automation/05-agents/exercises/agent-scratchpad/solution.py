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


def with_notes(system: str, notes: list[str]) -> str:
    lines = "\n".join(f"- {note}" for note in notes) or "(none yet)"
    return f"{system}\n\nYour notes so far:\n{lines}"


def run_with_notes(llm, task, tools, registry, *, system, max_steps=8, keep_last=4):
    """The agent loop, with a scratchpad of notes that survives history trimming."""
    messages = [{"role": "user", "content": task}]
    notes: list[str] = []
    for step in range(1, max_steps + 1):
        response = llm.complete(trim_history(messages, keep_last=keep_last),
                                system=with_notes(system, notes), tools=[*tools, TAKE_NOTE, FINISH])
        finish = next((call for call in response.tool_calls if call.name == "finish"), None)
        if finish is not None:
            return NotesResult(finish.arguments.get("answer"), notes, step)
        if not response.tool_calls:
            return NotesResult(response.text, notes, step)
        messages.append(assistant_message(response))
        for call in response.tool_calls:
            if call.name == "take_note":
                notes.append(call.arguments["text"])
                content = json.dumps({"saved": len(notes)})
            else:
                try:
                    content = json.dumps(registry[call.name](**call.arguments), default=str)
                except Exception as error:
                    content = json.dumps({"error": str(error)})
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
    return NotesResult(None, notes, max_steps)
