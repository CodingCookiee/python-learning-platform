import json
import math
from dataclasses import dataclass
from decimal import Decimal

PRICE = {"input": Decimal("3.00"), "output": Decimal("15.00")}   # EXAMPLE prices, dollars per million tokens


def estimate_tokens(text):
    return math.ceil(len(text) / 4)


class Budget:
    """Dollars for one run. worst_case estimates a call before it's made; charge records it after."""

    def __init__(self, limit, price=PRICE):
        self.limit = limit
        self.price = price
        self.spent = Decimal("0")

    def cost(self, input_tokens, output_tokens):
        return (input_tokens * self.price["input"] + output_tokens * self.price["output"]) / 1_000_000

    def worst_case(self, messages, *, system, tools, max_tokens):
        sent = (system or "") + json.dumps(messages) + json.dumps(tools or [])
        return self.cost(estimate_tokens(sent), max_tokens)

    def charge(self, response):
        self.spent += self.cost(response.usage.input_tokens, response.usage.output_tokens)


@dataclass
class AgentResult:
    answer: str | None
    stop_reason: str          # "finished" | "no_finish" | "budget" | "step_limit"
    steps: int                # model calls made


def run_agent(llm, task, tools, registry, *, budget, system=None, max_steps=10, max_tokens=500):
    messages = [{"role": "user", "content": task}]
    for step in range(1, max_steps + 1):
        worst = budget.worst_case(messages, system=system, tools=tools, max_tokens=max_tokens)
        if budget.spent + worst > budget.limit:
            return AgentResult(None, "budget", step - 1)
        response = llm.complete(messages, system=system, tools=tools, max_tokens=max_tokens)
        budget.charge(response)
        finish = next((c for c in response.tool_calls if c.name == "finish"), None)
        if finish is not None:
            return AgentResult(finish.arguments.get("answer"), "finished", step)
        if not response.tool_calls:
            return AgentResult(response.text, "no_finish", step)
        messages.append({"role": "assistant", "content": response.text,
                         "tool_calls": [{"id": c.id, "name": c.name, "arguments": c.arguments} for c in response.tool_calls]})
        for call in response.tool_calls:
            try:
                content = json.dumps(registry[call.name](**call.arguments), default=str)
            except Exception as error:
                content = json.dumps({"error": str(error)})
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})
    return AgentResult(None, "step_limit", max_steps)
