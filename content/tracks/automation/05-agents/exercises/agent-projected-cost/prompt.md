A client wants a price per run for their prospect-research agent. Write two functions for the
worst case, where the agent uses every step it's allowed:

```python
projected_cost(steps, *, first_input, growth_per_step, output_per_step, price) -> Decimal
steps_within_budget(budget, *, first_input, growth_per_step, output_per_step, price) -> int
```

- Step 1 sends `first_input` input tokens. Every later step sends `growth_per_step` more than the
  one before, because the history grows. Every step returns `output_per_step` output tokens.
- `price` is `{"input": Decimal, "output": Decimal}` in dollars per million tokens, as in A2.
- `projected_cost` returns the total cost of `steps` steps as a `Decimal` (`Decimal("0")` for 0
  steps). A negative number of steps raises `ValueError`.
- `steps_within_budget` returns the largest step cap whose projected cost is **at most**
  `budget` (0 if even one step costs more).

```python
PRICE = {"input": Decimal("3.00"), "output": Decimal("15.00")}   # EXAMPLE prices
projected_cost(4, first_input=350, growth_per_step=200, output_per_step=100, price=PRICE)
# input 350 + 550 + 750 + 950 = 2,600 tokens, output 400 tokens: Decimal("0.0138")
steps_within_budget(Decimal("0.0138"), first_input=350, growth_per_step=200, output_per_step=100, price=PRICE)
# 4
```
