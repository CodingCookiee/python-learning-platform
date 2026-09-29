The bookkeeping automation needs a contract for what the model extracts from each supplier invoice.
Write the Pydantic model `Invoice` and a function `parse_invoice(reply)`.

**`Invoice`**

| Field | Rule |
|-------|------|
| `invoice_number` | a string, not empty |
| `vendor` | a string |
| `issue_date`, `due_date` | dates, and the due date can't be before the issue date |
| `currency` | exactly `"EUR"`, `"GBP"` or `"USD"`, but accept any case and surrounding spaces from the model (`" eur"` becomes `"EUR"`) |
| `total` | a `Decimal`, more than 0, with at most 2 decimal places |

**`parse_invoice(reply)`** takes the model's reply text, finds the JSON object in it with the
`extract_json` helper in the starter, and returns a validated `Invoice`. It raises `ValueError`
when there's no JSON and `ValidationError` when the JSON breaks the contract.

```python
invoice = parse_invoice('Extracted: {"invoice_number": "INV-2291", "vendor": "Kiln Supplies", '
                        '"issue_date": "2026-09-15", "due_date": "2026-10-15", '
                        '"currency": "eur", "total": "1240.50"}')
invoice.currency     # "EUR"
invoice.total        # Decimal("1240.50")
invoice.due_date     # datetime.date(2026, 10, 15)
```
