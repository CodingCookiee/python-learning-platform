Each month you invoice the agency for support and monitoring, plus the AI usage of its report bot,
which you pay the provider for and pass through at an agreed **margin** (`ai_margin=0.2` means 20%
of the AI line's price is yours). `monthly_invoice(...)` returns the invoice's lines and total.

Your first invoice showed the AI line, but the total didn't include it, and the agency paid the
total. You covered their AI bill yourself. There's a second, smaller bug in how the AI line is
priced. Fix both.

```python
monthly_invoice(support_hours=4, hourly_rate=60, ai_calls=9000,
                cost_per_call=Decimal("0.004"), ai_margin=Decimal("0.2"))
# {"lines": [("Support and monitoring", Decimal("240.00")),
#            ("AI usage (passed through)", Decimal("45.00"))],
#  "total": Decimal("285.00")}
```

9,000 calls at 0.004 cost 36.00, and 36 / (1 − 0.2) is 45. All the numbers are examples.
