import json
from dataclasses import dataclass

FINISH = {"name": "finish", "description": "Call this once, when you're done.",
          "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]}}
DECLINED = "A person declined {name}. Don't try it again; tell the user what you would have done instead."


@dataclass
class Outcome:
    status: str                 # finished | no_finish | step_limit | paused
    answer: str | None = None
    state: str | None = None    # JSON, when paused
    pending: list | None = None  # the risky calls waiting for a person, when paused


def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}


def start_run(llm, task, tools, registry, *, risky, max_steps=8):
    """Run the agent until it finishes, or until it wants a risky tool."""
    ...


def resume_run(llm, state, *, approved, tools, registry, risky, max_steps=8):
    """Carry on a paused run, with the person's decision about its risky calls."""
    ...
