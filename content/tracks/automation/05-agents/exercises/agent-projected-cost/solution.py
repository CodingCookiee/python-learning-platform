from decimal import Decimal


def projected_cost(
    steps: int, *, first_input: int, growth_per_step: int, output_per_step: int, price: dict[str, Decimal]
) -> Decimal:
    """The worst-case cost of an agent run that uses all its steps."""
    if steps < 0:
        raise ValueError(f"steps must be 0 or more, got {steps}")
    input_tokens = sum(first_input + k * growth_per_step for k in range(steps))
    output_tokens = steps * output_per_step
    return (input_tokens * price["input"] + output_tokens * price["output"]) / 1_000_000


def steps_within_budget(
    budget: Decimal, *, first_input: int, growth_per_step: int, output_per_step: int, price: dict[str, Decimal]
) -> int:
    """The largest step cap whose worst-case cost fits in the budget."""
    sizes = {"first_input": first_input, "growth_per_step": growth_per_step, "output_per_step": output_per_step}
    steps = 0
    while projected_cost(steps + 1, **sizes, price=price) <= budget:
        steps += 1
    return steps
