import math
from decimal import Decimal


class BudgetExceeded(Exception):
    """A call was refused because it could take spending over the budget."""


def estimate_tokens(text):
    """About one token per four characters, rounded up."""
    return math.ceil(len(text) / 4)


def cost(input_tokens, output_tokens, price):
    return (input_tokens * price["input"] + output_tokens * price["output"]) / 1_000_000


class BudgetedLLM:
    """Any LLM, refusing calls whose worst case would go over the budget."""

    def __init__(self, llm, *, prices, budget):
        self._llm = llm
        self._prices = prices
        self.budget = budget
        self.spent = Decimal("0")

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        chosen = model or self._llm.model
        price = self._prices.get(chosen)
        if price is None:
            raise ValueError(f"No price for model {chosen!r}")

        input_tokens = estimate_tokens(system or "") + sum(estimate_tokens(m["content"]) for m in messages)
        worst_case = cost(input_tokens, max_tokens, price)
        if self.spent + worst_case > self.budget:
            raise BudgetExceeded(
                f"This call could cost up to ${worst_case}, and only ${self.remaining} of the budget is left"
            )

        response = self._llm.complete(
            messages, system=system, tools=tools, model=model, max_tokens=max_tokens, temperature=temperature
        )
        self.spent += cost(response.usage.input_tokens, response.usage.output_tokens, price)
        return response

    @property
    def remaining(self):
        return self.budget - self.spent
