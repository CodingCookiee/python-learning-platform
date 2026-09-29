The clinic's reminder system is live, and you look after it on a monthly retainer: a fixed fee
that includes a number of support hours, extra hours at an agreed rate, and the month's AI and SMS
usage passed through at a margin. Write

`retainer_invoice(*, fee, included_hours, hours_used, overage_rate, ai_cost=0, ai_margin=Decimal("0.2"), increment=Decimal("0.5"))`

which returns `{"lines": [(description, amount), ...], "total": amount}`, every amount a `Decimal`
to the cent (rounding half up):

1. Always: `("Maintenance retainer (<included_hours> hours included)", fee)`.
2. Only when `hours_used` is more than `included_hours`: the extra hours, rounded **up** to the
   billing `increment` (half an hour by default), as
   `("Extra support: <billed hours> hours at <overage_rate>", billed hours × overage_rate)`.
   Unused hours don't carry over.
3. Only when `ai_cost` is more than 0: `("AI and API usage, passed through", ai_cost / (1 − ai_margin))`.

The total is the sum of the lines.

```python
retainer_invoice(fee=400, included_hours=5, hours_used=Decimal("6.2"), overage_rate=60,
                 ai_cost=Decimal("52.40"))
# {"lines": [("Maintenance retainer (5 hours included)", Decimal("400.00")),
#            ("Extra support: 1.5 hours at 60", Decimal("90.00")),
#            ("AI and API usage, passed through", Decimal("65.50"))],
#  "total": Decimal("555.50")}
```

1.2 extra hours are billed as 1.5. The fee and rates are examples.
