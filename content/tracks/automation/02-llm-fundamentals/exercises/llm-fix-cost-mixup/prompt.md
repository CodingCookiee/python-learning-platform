`call_cost(usage, price)` returns what one call cost in dollars, as a `Decimal`. `price` holds the
model's `input` and `output` prices in dollars per **million** tokens. The monthly report says the
ticket summariser, which reads long tickets and writes one line, costs over three times what the
provider billed. Find the bug and fix it.

```python
price = {"input": Decimal("0.50"), "output": Decimal("2.00")}   # EXAMPLE prices, not real ones
call_cost(Usage(input_tokens=1_800, output_tokens=120), price)
# Decimal("0.00114"): 1,800 × 0.50 / 1,000,000 + 120 × 2.00 / 1,000,000
```
