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
    price = candidate.price
    return (input_tokens * price["input"] + output_tokens * price["output"]) / 1_000_000


def pick_model(candidates, *, input_tokens, output_tokens, min_quality, max_latency_ms):
    """The cheapest candidate that meets the quality and latency limits."""
    eligible = [c for c in candidates if c.quality >= min_quality and c.latency_ms <= max_latency_ms]
    if not eligible:
        raise ValueError(f"No model reaches quality {min_quality} within {max_latency_ms} ms")
    return min(
        eligible,
        key=lambda c: (cost_per_task(c, input_tokens=input_tokens, output_tokens=output_tokens), -c.quality, c.latency_ms),
    )
