A marketing agency wants its monthly client reports built automatically, with an AI-written
summary of each client's month. Write the function you'll price it with:
`quote(*, hours, hourly_rate, risk_buffer, ai_cost_per_month=0, ai_margin=Decimal("0.2"), round_to=50)`.
Every number is an int or a `Decimal`.

- **Build price**: `hours` padded by the `risk_buffer` (0.2 means 20% more hours), times the
  `hourly_rate`, then rounded **up** to the next multiple of `round_to`. An amount that's already a
  multiple stays as it is.
- **AI per month**: the client's expected AI usage, `ai_cost_per_month`, passed through at a
  **margin** of `ai_margin` (a 0.2 margin means 20% of the price is yours), to the cent, rounding
  half up.
- **First year**: the build price plus twelve months of AI.

Raise `ValueError` if `ai_margin` isn't at least 0 and less than 1, or `risk_buffer` is negative.
Return a dict with the keys `build`, `ai_per_month` and `first_year`.

```python
quote(hours=40, hourly_rate=60, risk_buffer=Decimal("0.2"), ai_cost_per_month=120)
# {"build": Decimal("2900"), "ai_per_month": Decimal("150.00"), "first_year": Decimal("4700.00")}
```

48 hours at 60 is 2880, rounded up to 2900. The rates and costs are examples.
