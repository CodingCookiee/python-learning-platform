Write `validation_feedback(error)` that turns a Pydantic `ValidationError` into the text your
repair loop will send back to the model: one line per problem, `location: message`, joined with
newlines.

- The location is the field path joined with dots: `total`, or `lines.0.quantity` for a field
  inside a list.
- A problem with the whole object (a model validator, or input that isn't an object at all) has an
  empty location. Write it as `(root)`.

```python
try:
    Invoice.model_validate({"invoice_number": "INV-2291", "total": -40, "currency": "YEN"})
except ValidationError as error:
    print(validation_feedback(error))
```

```text
total: Input should be greater than 0
currency: Input should be 'EUR', 'GBP' or 'USD'
```
