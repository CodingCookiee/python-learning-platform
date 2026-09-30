import json
from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field, ValidationError


class Diagnosis(BaseModel):
    """What you found. Call finish with these fields once you're confident, or when you're stuck."""

    summary: str
    likely_cause: Literal["deploy", "dependency", "capacity", "unknown"]
    suggested_action: str
    evidence: list[str] = Field(min_length=1, description="Facts from tool results, e.g. deploy ids")


FINISH = {
    "name": "finish",
    "description": "What you found. Call finish with these fields once you're confident, or when you're stuck.",
    "parameters": {
        "type": "object",
        "required": ["summary", "likely_cause", "suggested_action", "evidence"],
        "properties": {
            "summary": {"type": "string"},
            "likely_cause": {"type": "string", "enum": ["deploy", "dependency", "capacity", "unknown"]},
            "suggested_action": {"type": "string"},
            "evidence": {"type": "array", "items": {"type": "string"}, "minItems": 1,
                         "description": "Facts from tool results, e.g. deploy ids"},
        },
    },
}
NUDGE = "Please reply by calling the finish tool with every field filled in."


@dataclass
class Step:
    number: int
    tool: str
    arguments: dict
    ok: bool


@dataclass
class AgentResult:
    answer: Diagnosis | None
    stop_reason: str          # "finished" | "no_finish" | "step_limit"
    steps: int
    trace: list[Step] = field(default_factory=list)


def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}


def tool_result(call, content):
    return {"role": "tool", "tool_call_id": call.id, "content": content}


def run_tool(call, registry):
    """Run one normal call: returns (content, ok)."""
    if call.name not in registry:
        return json.dumps({"error": f"Unknown tool: {call.name}"}), False
    try:
        return json.dumps(registry[call.name](**call.arguments), default=str), True
    except Exception as error:
        return json.dumps({"error": str(error)}), False


def run_agent(llm, task, tools, registry, *, system=None, max_steps=8, max_nudges=1):
    """The agent loop, with the final answer validated as a Diagnosis."""
    ...
