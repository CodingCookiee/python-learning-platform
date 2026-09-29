`parse_label(data)` checks the lead scorer's JSON by hand: fifteen lines of `if` and `raise` that
nobody wants to extend, and that disagree with the schema sent to the model whenever someone
adds a label to one and forgets the other.

Replace the checks with a Pydantic model, `LeadLabel`, and make `parse_label` return one:

- `label` is exactly `"hot"`, `"warm"` or `"cold"`. Keep accepting the case and spacing slips the
  current code tolerates (`" Hot "` is `"hot"`).
- `confidence` is a number from 0 to 1. Numeric strings like `"0.8"` still work.
- Anything invalid still raises a `ValueError` (Pydantic's `ValidationError` is one).
- No `raise` statements are left in the file: the model's field types and constraints do the
  refusing.

```python
result = parse_label({"label": " Hot ", "confidence": "0.8"})
result.label        # "hot"
result.confidence   # 0.8
parse_label({"label": "lukewarm", "confidence": 0.5})   # raises ValueError
```
