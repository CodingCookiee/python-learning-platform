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


FINISH = {"name": "finish", "description": Diagnosis.__doc__, "parameters": Diagnosis.model_json_schema()}
NUDGE = "Please reply by calling the finish tool with every field filled in."
NOT_RUN = json.dumps({"error": "Not run, because this turn called finish."})


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


def describe(error: ValidationError) -> str:
    problems = "; ".join(f"{'.'.join(str(p) for p in e['loc']) or '(arguments)'}: {e['msg']}" for e in error.errors())
    return f"finish arguments are invalid: {problems}"


def run_agent(llm, task, tools, registry, *, system=None, max_steps=8, max_nudges=1):
    """The agent loop, with the final answer validated as a Diagnosis."""
    messages = [{"role": "user", "content": task}]
    trace: list[Step] = []
    nudges = 0
    for step in range(1, max_steps + 1):
        response = llm.complete(messages, system=system, tools=[*tools, FINISH])
        finish = next((call for call in response.tool_calls if call.name == "finish"), None)

        if finish is not None:
            try:
                return AgentResult(Diagnosis.model_validate(finish.arguments), "finished", step, trace)
            except ValidationError as error:
                messages.append(assistant_message(response))
                for call in response.tool_calls:
                    content = json.dumps({"error": describe(error)}) if call is finish else NOT_RUN
                    messages.append(tool_result(call, content))
                continue

        if not response.tool_calls:
            if nudges >= max_nudges:
                return AgentResult(None, "no_finish", step, trace)
            nudges += 1
            messages.append(assistant_message(response))
            messages.append({"role": "user", "content": NUDGE})
            continue

        messages.append(assistant_message(response))
        for call in response.tool_calls:
            content, ok = run_tool(call, registry)
            trace.append(Step(step, call.name, call.arguments, ok))
            messages.append(tool_result(call, content))
    return AgentResult(None, "step_limit", max_steps, trace)
