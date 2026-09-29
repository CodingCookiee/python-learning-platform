from dataclasses import dataclass
from decimal import Decimal


@dataclass
class CallRecord:
    model: str
    input_tokens: int
    output_tokens: int
    cost: Decimal


class CostTracker:
    """Any LLM, with the cost of every call recorded."""

    def __init__(self, llm, prices):
        self._llm = llm
        self._prices = prices
        self.records = []

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        response = self._llm.complete(
            messages, system=system, tools=tools, model=model, max_tokens=max_tokens, temperature=temperature
        )
        price = self._prices.get(response.model)
        if price is None:
            raise ValueError(f"No price for model {response.model!r}: add it to the pricing table")
        usage = response.usage
        cost = (usage.input_tokens * price["input"] + usage.output_tokens * price["output"]) / 1_000_000
        self.records.append(CallRecord(response.model, usage.input_tokens, usage.output_tokens, cost))
        return response

    @property
    def total_cost(self):
        return sum((record.cost for record in self.records), Decimal("0"))

    def cost_by_model(self):
        totals = {}
        for record in self.records:
            totals[record.model] = totals.get(record.model, Decimal("0")) + record.cost
        return totals
