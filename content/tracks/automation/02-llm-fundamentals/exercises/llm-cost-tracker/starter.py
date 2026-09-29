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
        ...

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        ...

    @property
    def total_cost(self):
        ...

    def cost_by_model(self):
        ...
