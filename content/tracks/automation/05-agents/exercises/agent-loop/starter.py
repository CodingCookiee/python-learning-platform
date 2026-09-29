import json
from dataclasses import dataclass, field

FINISH = {
    "name": "finish",
    "description": "Call this once, when you're done. The answer must stand on its own.",
    "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]},
}


@dataclass
class Step:
    number: int
    tool: str
    arguments: dict
    ok: bool


@dataclass
class AgentResult:
    answer: str | None
    stop_reason: str          # "finished" | "no_finish" | "step_limit"
    steps: int                # model calls made
    trace: list[Step] = field(default_factory=list)


def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}


def tool_result(call, content):
    return {"role": "tool", "tool_call_id": call.id, "content": content}


def run_agent(llm, task, tools, registry, *, system=None, max_steps=8):
    """Work towards the task with tools until the model calls finish, stops, or runs out of steps."""
    ...
