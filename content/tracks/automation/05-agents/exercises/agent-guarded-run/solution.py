import json
import math
from collections import Counter
from dataclasses import dataclass, field
from decimal import Decimal

FINISH = {"name": "finish", "description": "Call this once, when you're done.",
          "parameters": {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]}}


@dataclass
class Limits:
    max_steps: int = 8
    max_cost: Decimal = Decimal("0.05")
    max_seconds: float = 60.0
    max_repeats: int = 3
    price: dict = field(default_factory=lambda: {"input": Decimal("3.00"), "output": Decimal("15.00")})  # EXAMPLE prices


@dataclass
class GuardedResult:
    answer: str | None
    stop_reason: str      # finished | no_finish | step_limit | timeout | budget | loop
    steps: int
    cost: Decimal


def estimate_tokens(text):
    return math.ceil(len(text) / 4)


def call_cost(usage, price):
    return (usage.input_tokens * price["input"] + usage.output_tokens * price["output"]) / 1_000_000


def worst_case_cost(messages, system, tools, max_tokens, price):
    sent = (system or "") + json.dumps(messages) + json.dumps(tools)
    return (estimate_tokens(sent) * price["input"] + max_tokens * price["output"]) / 1_000_000


def assistant_message(response):
    return {"role": "assistant", "content": response.text,
            "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]}


def run_tool(call, registry):
    if call.name not in registry:
        return json.dumps({"error": f"Unknown tool: {call.name}"})
    try:
        return json.dumps(registry[call.name](**call.arguments), default=str)
    except Exception as error:
        return json.dumps({"error": str(error)})


def run_guarded(llm, task, tools, registry, *, limits, clock, system=None, max_tokens=500):
    """The agent loop under a step cap, a cost budget, a deadline and loop detection."""
    started = clock()
    offered = [*tools, FINISH]
    messages = [{"role": "user", "content": task}]
    cost = Decimal("0")
    seen: Counter[tuple[str, str]] = Counter()
    steps = 0

    def stop(reason, answer=None):
        return GuardedResult(answer, reason, steps, cost)

    while steps < limits.max_steps:
        if clock() - started >= limits.max_seconds:
            return stop("timeout")
        if cost + worst_case_cost(messages, system, offered, max_tokens, limits.price) > limits.max_cost:
            return stop("budget")

        response = llm.complete(messages, system=system, tools=offered, max_tokens=max_tokens)
        steps += 1
        cost += call_cost(response.usage, limits.price)

        finish = next((call for call in response.tool_calls if call.name == "finish"), None)
        if finish is not None:
            return stop("finished", finish.arguments.get("answer"))
        if not response.tool_calls:
            return stop("no_finish", response.text)

        messages.append(assistant_message(response))
        for call in response.tool_calls:
            key = (call.name, json.dumps(call.arguments, sort_keys=True))
            seen[key] += 1
            if seen[key] >= limits.max_repeats:
                return stop("loop")
            messages.append({"role": "tool", "tool_call_id": call.id, "content": run_tool(call, registry)})
    return stop("step_limit")
