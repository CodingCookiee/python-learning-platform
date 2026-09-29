A nightly job imports signups from a partner site. `validate_customer` (already correct) raises an
`ExceptionGroup` of `FieldError`s for a bad record. `import_customers(records)` is meant to keep
the good records and list every problem with the bad ones, but it crashes on the first bad record.

Fix `import_customers` so it returns `(accepted, rejected)`:

- `accepted` is the cleaned records that passed, in order,
- `rejected` has one `"row <n>: <problem>"` message per `FieldError`, numbering rows from 1.

```python
records = [
    {"name": "Ada Lovelace", "email": "ada@example.com", "age": "36"},
    {"name": "", "email": "grace.example.com", "age": "40"},
    {"name": "Linus", "email": "linus@example.org", "age": "twelve"},
]
import_customers(records)
# ([{"name": "Ada Lovelace", "email": "ada@example.com", "age": 36}],
#  ["row 2: name is required", "row 2: email must contain @", "row 3: age must be a whole number"])
```

A record that isn't a dict at all means the partner's file is broken: `validate_customer` raises
`TypeError`, and that must still stop the import. Don't change `validate_customer`.
