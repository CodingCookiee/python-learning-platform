from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Candidate:
    model: str
    quality: float  # share of eval cases passed, 0 to 1
    latency_ms: float  # median time for a full reply
    price: dict  # {"input": Decimal, "output": Decimal}, dollars per million tokens


def cost_per_task(candidate, *, input_tokens, output_tokens):
    """What one task of this size costs on this model."""
    ...


def pick_model(candidates, *, input_tokens, output_tokens, min_quality, max_latency_ms):
    """The cheapest candidate that meets the quality and latency limits."""
    ...
