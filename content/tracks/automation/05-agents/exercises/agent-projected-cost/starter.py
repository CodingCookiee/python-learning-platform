from decimal import Decimal


def projected_cost(steps, *, first_input, growth_per_step, output_per_step, price):
    """The worst-case cost of an agent run that uses all its steps."""
    ...


def steps_within_budget(budget, *, first_input, growth_per_step, output_per_step, price):
    """The largest step cap whose worst-case cost fits in the budget."""
    ...
