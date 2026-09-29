A fixed-price project is paid in stages: a deposit before you start, then an invoice at each
milestone the client accepts. Write `invoice_schedule(total, milestones, *, start)`.

- `total` is the project price (an int or a `Decimal`).
- `milestones` is a list of `(name, percent, week)`: the share of the total, as a whole percentage,
  and the week after `start` (a `date`) when that invoice is due. The deposit is week 0.

Return one dict per milestone, in order: `{"milestone": name, "amount": Decimal, "due": date}`.
Each amount is its percentage of the total, rounded half up to the cent, **except the last**, which
is whatever remains, so the invoices always add up to exactly the total.

Raise `ValueError` if the percentages don't add up to 100, or if a milestone's week is earlier than
the one before it.

```python
invoice_schedule(7000, [("Deposit", 30, 0), ("Pilot live", 40, 3), ("Handover", 30, 6)],
                 start=date(2026, 11, 2))
# [{"milestone": "Deposit", "amount": Decimal("2100.00"), "due": date(2026, 11, 2)},
#  {"milestone": "Pilot live", "amount": Decimal("2800.00"), "due": date(2026, 11, 23)},
#  {"milestone": "Handover", "amount": Decimal("2100.00"), "due": date(2026, 12, 14)}]
```
