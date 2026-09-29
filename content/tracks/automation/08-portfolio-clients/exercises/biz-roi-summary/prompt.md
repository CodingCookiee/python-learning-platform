A1's payback calculator counted time saved and errors avoided. A proposal needs a little more:
revenue the automation makes possible, and the return over the first year. Write
`roi_summary(*, build_price, ...)`, with keyword-only arguments that are ints or `Decimal`s:

| Argument | Default | Meaning |
|----------|---------|---------|
| `build_price` | required | what you'll charge; must be more than 0, or raise `ValueError` |
| `hours_saved_per_month`, `hourly_rate` | `0` | time saved, and what that time costs the client |
| `errors_avoided_per_month`, `cost_per_error` | `0` | mistakes that won't happen, and what each one costs |
| `revenue_enabled_per_month` | `0` | extra revenue, only when the client's own numbers support it |
| `running_cost_per_month` | `0` | hosting, AI usage, your retainer |

Return a dict of `Decimal`s (and one `None`):

| Key | Value | Rounded to |
|-----|-------|-----------|
| `monthly_benefit` | time value + error value + revenue enabled | 0.01 |
| `monthly_net` | the benefit minus the running cost | 0.01 |
| `payback_months` | build price / net, or `None` if the net is zero or less | 0.1 |
| `first_year_roi` | (12 × net − build price) / build price × 100, a percentage | whole number |

Round with `ROUND_HALF_UP`, working from the unrounded net.

```python
roi_summary(build_price=4200, hours_saved_per_month=30, hourly_rate=18,
            errors_avoided_per_month=6, cost_per_error=90,
            revenue_enabled_per_month=400, running_cost_per_month=80)
# {"monthly_benefit": Decimal("1480.00"), "monthly_net": Decimal("1400.00"),
#  "payback_months": Decimal("3.0"), "first_year_roi": Decimal("300")}
```

All the numbers are examples, in whatever currency your client uses.
