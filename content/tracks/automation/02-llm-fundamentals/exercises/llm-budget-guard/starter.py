import math
from decimal import Decimal


class BudgetExceeded(Exception):
    """A call was refused because it could take spending over the budget."""


def estimate_tokens(text):
    """About one token per four characters, rounded up."""
    return math.ceil(len(text) / 4)


class BudgetedLLM:
    """Any LLM, refusing calls whose worst case would go over the budget."""

    def __init__(self, llm, *, prices, budget):
        ...

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        ...

    @property
    def remaining(self):
        ...
