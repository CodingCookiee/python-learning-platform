`apply_discount(total, code, codes)` already works out a basket's total after a discount code.
`codes` maps each code, in capitals, to a percentage off, and codes are matched whatever their case.
Support keeps asking "why didn't my code work?", so make it log what happened, through a logger for
the module (`logging.getLogger(__name__)`):

| Situation | Level | Message |
|-----------|-------|---------|
| a known code was applied | `INFO` | `applied SUMMER10: 80.00 -> 72.00` (the code in capitals, the total before and after) |
| the code isn't known | `WARNING` | `unknown discount code 'summr10'` (the code as typed, with quotes) |
| no code was given (`None` or `""`) | nothing is logged | |

```python
codes = {"SUMMER10": 10, "STAFF25": 25}
apply_discount(Decimal("80.00"), "summer10", codes)   # Decimal("72.00"), logs INFO
apply_discount(Decimal("80.00"), "summr10", codes)    # Decimal("80.00"), logs WARNING
apply_discount(Decimal("80.00"), None, codes)         # Decimal("80.00"), logs nothing
```

Keep the calculation as it is, and don't print anything.
