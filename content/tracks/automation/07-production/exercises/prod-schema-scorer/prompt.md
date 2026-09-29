The invoice extractor processes 10,000 documents a day, and its eval has 60 golden invoices. Each
case's `expected` holds only the fields that matter for that invoice, as plain JSON from the
JSONL file.

Write `schema_score(output, model, expected)`, which returns a `Score(passed, reason)` (in the
starter) for one extraction output:

1. The output must be JSON. If not, fail with a reason starting `not JSON`.
2. It must validate against `model` (a Pydantic model class). If not, fail with a reason starting
   `invalid:` followed by every problem as `location: message`, separated by `; `.
3. Every field in `expected` must equal the validated value. The case's values are plain JSON, so
   convert each to its field's type first (`"1240.50"` must equal `Decimal("1240.5")`, and
   `"2026-09-01"` must equal a `date`). If any differ, fail with a reason starting `wrong ` that names
   each wrong field.

Otherwise it passes with the reason `"ok"`.

```python
class Invoice(BaseModel):
    invoice_number: str
    vendor: str
    currency: Literal["EUR", "GBP", "USD"]
    total: Decimal

output = '{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "currency": "EUR", "total": 1240.5}'
schema_score(output, Invoice, {"invoice_number": "INV-2291", "total": "1240.50"})
# Score(passed=True, reason='ok')

schema_score(output.replace("EUR", "euro"), Invoice, {"total": "1240.50"})
# Score(passed=False, reason="invalid: currency: Input should be 'EUR', 'GBP' or 'USD'")
```
