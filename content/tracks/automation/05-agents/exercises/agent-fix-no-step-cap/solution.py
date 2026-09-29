import json
from dataclasses import dataclass, field

SYSTEM = "You are the on-call helper for Kiln & Co's platform team. Investigate the alert, then call finish."
TOOLS = [
    {"name": "get_error_rate", "description": "Current 5xx rate for a service, from the metrics API.",
     "parameters": {"type": "object", "properties": {"service": {"type": "string"}}, "required": ["service"]}},
    {"name": "finish", "description": "Call this once, when you're done.",
     "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]}},
]


class MetricsTimeout(Exception):
    pass


def get_error_rate(service):
    raise MetricsTimeout("metrics API did not answer within 10s")


REGISTRY = {"get_error_rate": get_error_rate}


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
    steps: int
    trace: list[Step] = field(default_factory=list)


def work_alert(llm, alert, *, max_steps=6):
    messages = [{"role": "user", "content": alert}]
    trace = []
    for step in range(1, max_steps + 1):
        response = llm.complete(messages, system=SYSTEM, tools=TOOLS)
        finish = next((c for c in response.tool_calls if c.name == "finish"), None)
        if finish is not None:
            return AgentResult(finish.arguments["answer"], "finished", step, trace)
        if not response.tool_calls:
            return AgentResult(response.text, "no_finish", step, trace)
        messages.append({"role": "assistant", "content": response.text,
                         "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]})
        for call in response.tool_calls:
            try:
                content, ok = json.dumps(REGISTRY[call.name](**call.arguments)), True
            except Exception as error:
                content, ok = json.dumps({"error": str(error)}), False
            trace.append(Step(step, call.name, call.arguments, ok))
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
    return AgentResult(None, "step_limit", max_steps, trace)
