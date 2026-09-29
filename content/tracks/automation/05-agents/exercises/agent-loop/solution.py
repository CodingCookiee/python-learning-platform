import json
from dataclasses import dataclass, field
from typing import Callable

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


def run_tool(call, registry: dict[str, Callable]) -> tuple[str, bool]:
    """Run one call; failures become an error observation."""
    if call.name not in registry:
        return json.dumps({"error": f"Unknown tool: {call.name}"}), False
    try:
        return json.dumps(registry[call.name](**call.arguments), default=str), True
    except Exception as error:
        return json.dumps({"error": str(error)}), False


def run_agent(llm, task: str, tools: list[dict], registry: dict[str, Callable], *,
              system: str | None = None, max_steps: int = 8) -> AgentResult:
    """Work towards the task with tools until the model calls finish, stops, or runs out of steps."""
    messages = [{"role": "user", "content": task}]
    trace: list[Step] = []
    for step in range(1, max_steps + 1):
        response = llm.complete(messages, system=system, tools=[*tools, FINISH])
        finish = next((call for call in response.tool_calls if call.name == "finish"), None)
        if finish is not None:
            return AgentResult(finish.arguments.get("answer"), "finished", step, trace)
        if not response.tool_calls:
            return AgentResult(response.text, "no_finish", step, trace)
        messages.append(assistant_message(response))
        for call in response.tool_calls:
            content, ok = run_tool(call, registry)
            trace.append(Step(step, call.name, call.arguments, ok))
            messages.append(tool_result(call, content))
    return AgentResult(None, "step_limit", max_steps, trace)
