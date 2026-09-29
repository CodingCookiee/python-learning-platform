A signup form sends a dict of strings. Telling the customer about one problem at a time makes them
submit the form over and over, so write `validate_customer(record)` that checks every field and
reports **all** the problems at once.

The starter gives you `FieldError(field, problem)`, a `ValueError` whose message is
`"<field> <problem>"`. Check the fields in this order, treating a missing key as an empty string:

| Field | Cleaned value | Problem |
|-------|---------------|---------|
| `name` | surrounding spaces removed | `is required` if it's empty |
| `email` | spaces removed, lowercased | `must contain @` if there's no `@` |
| `age` | an `int` | `must be a whole number` if `int()` refuses it, else `must be between 18 and 120` if it's outside that range |

If there are any problems, raise `ExceptionGroup("invalid customer", errors)` holding one
`FieldError` per problem, in field order. Otherwise return the cleaned record.

```python
validate_customer({"name": " Ada Lovelace ", "email": "ADA@example.com", "age": "36"})
# {"name": "Ada Lovelace", "email": "ada@example.com", "age": 36}

validate_customer({"name": "", "email": "ada.example.com", "age": "12"})
# ExceptionGroup: invalid customer (3 sub-exceptions)
#   FieldError: name is required
#   FieldError: email must contain @
#   FieldError: age must be between 18 and 120
```

A record with only one problem still raises a group, of one, so callers handle every failed
signup the same way.
