from dataclasses import dataclass
from decimal import Decimal


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


def call_cost(usage, price):
    """The cost of one call in dollars; price is per million input and output tokens."""
    return (usage.input_tokens * price["input"] + usage.output_tokens * price["output"]) / 1_000_000
