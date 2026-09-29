from decimal import Decimal

from plp import hidden, raises, test
from solution import Candidate, cost_per_task, pick_model

# EXAMPLE prices, invented for practice
SMALL = Candidate("model-small", 0.86, 420, {"input": Decimal("0.50"), "output": Decimal("2.00")})
MEDIUM = Candidate("model-medium", 0.95, 900, {"input": Decimal("2.50"), "output": Decimal("10.00")})
LARGE = Candidate("model-large", 0.97, 2_100, {"input": Decimal("12.00"), "output": Decimal("48.00")})
# Another provider's medium model: cheaper input, dearer output
OTHER = Candidate("other-medium", 0.95, 700, {"input": Decimal("2.00"), "output": Decimal("12.00")})


def pick(candidates, input_tokens=1_800, output_tokens=120, min_quality=0.93, max_latency_ms=1_500):
    return pick_model(candidates, input_tokens=input_tokens, output_tokens=output_tokens,
                      min_quality=min_quality, max_latency_ms=max_latency_ms)


@test("Prices a task and picks a model, like the example")
def _():
    assert cost_per_task(MEDIUM, input_tokens=1_800, output_tokens=120) == Decimal("0.0057")
    assert pick([SMALL, MEDIUM, LARGE]).model == "model-medium"


@test("Picks the cheapest when several qualify")
def _():
    assert pick([SMALL, MEDIUM, LARGE], min_quality=0.8, max_latency_ms=5_000).model == "model-small"
    assert pick([LARGE, MEDIUM, SMALL], min_quality=0.96, max_latency_ms=5_000).model == "model-large"


@test("The task's shape decides between input-heavy and output-heavy prices")
def _():
    # Long ticket, short label: OTHER's cheaper input wins
    assert pick([MEDIUM, OTHER], input_tokens=1_800, output_tokens=120).model == "other-medium"
    # Short prompt, long draft: MEDIUM's cheaper output wins
    assert pick([MEDIUM, OTHER], input_tokens=200, output_tokens=2_000).model == "model-medium"


@test("Limits are inclusive")
def _():
    assert pick([MEDIUM], min_quality=0.95, max_latency_ms=900).model == "model-medium"


@test("Refuses when nothing qualifies")
def _():
    raises(ValueError, pick_model, [SMALL, LARGE], input_tokens=1_800, output_tokens=120, min_quality=0.93, max_latency_ms=1_500)
    raises(ValueError, pick_model, [], input_tokens=1_800, output_tokens=120, min_quality=0.5, max_latency_ms=1_500)


@hidden("Breaks a tie in cost by quality, then by latency")
def _():
    price = {"input": Decimal("1.00"), "output": Decimal("4.00")}
    first = Candidate("tie-a", 0.94, 800, price)
    better = Candidate("tie-b", 0.96, 950, price)
    faster = Candidate("tie-c", 0.96, 600, price)
    assert pick([first, better]).model == "tie-b"
    assert pick([first, better, faster]).model == "tie-c"
