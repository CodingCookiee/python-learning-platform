A supplier sends its catalogue as JSON Lines: one JSON object per line. Some lines are always
wrong. Load every good product, and report every problem without stopping at the first one.

**`Product` model**

| Field | Type | Rules |
|-------|------|-------|
| `sku` | str | uppercase letters and digits in groups joined by single hyphens, such as `MUG-01` |
| `name` | str | 1 to 80 characters |
| `price` | Decimal | more than 0, at most 8 digits with 2 decimal places |
| `stock` | int | 0 or more, defaults to 0 |
| `tags` | list of str | defaults to an empty list |

Surrounding spaces are stripped from every string field before it's checked, so `" MUG-01 "` is
valid.

**`load_catalogue(lines: Iterable[str]) -> tuple[list[Product], list[str]]`**

- Returns the valid products, in order, and a list of problems.
- Each problem reads `line N: location: message`, numbering lines from 1. Use Pydantic's message, and
  `(line)` as the location when the whole line is the problem (invalid JSON). A line with several
  problems gives several messages.
- A product whose SKU was already loaded is a problem too: `line N: duplicate sku MUG-01`.
- Blank lines are skipped, but still counted.

```python
products, problems = load_catalogue([
    '{"sku": "MUG-01", "name": "Stoneware mug", "price": "8.00", "stock": 12}',
    '{"sku": "mug-02", "name": "Espresso cup", "price": "6.50"}',
    '',
    '{"sku": "MUG-01", "name": "Mug again", "price": "9.00"}',
])
[p.sku for p in products]   # ["MUG-01"]
problems
# ["line 2: sku: String should match pattern '^[A-Z0-9]+(-[A-Z0-9]+)*$'",
#  "line 4: duplicate sku MUG-01"]
```
