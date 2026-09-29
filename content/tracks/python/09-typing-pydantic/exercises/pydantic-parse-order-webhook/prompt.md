The storefront sends an `order.created` webhook as JSON. Model it with Pydantic and write two
functions around it.

**Models**

- `Customer`: `email` and `name`, both strings.
- `LineItem`: `sku` (str), `quantity` (int, more than 0) and `unit_price` (a `Decimal`, more than 0,
  with at most 2 decimal places).
- `OrderCreated`: `order_id` (str), `placed_at` (a `datetime`), `currency` (exactly `"GBP"`, `"EUR"`
  or `"USD"`), `customer` (a `Customer`) and `lines` (a list of `LineItem`, at least one). Give it a
  read-only `total` property: the sum of unit price times quantity, as a `Decimal`.

**Functions**

- `parse_order(raw: str) -> OrderCreated` parses and validates the JSON text, raising
  `ValidationError` if anything is wrong.
- `error_summary(raw: str) -> list[str]` returns one line per problem, for the webhook's error
  response: the field's location joined with dots, a colon, and Pydantic's message. When the problem
  is the body itself (invalid JSON, say), the location is `(body)`. A valid body gives `[]`.

This is the body the examples use, as `RAW`:

```json
{"order_id": "A1042", "placed_at": "2026-09-29T10:15:00Z", "currency": "EUR",
 "customer": {"email": "ada@example.com", "name": "Ada"},
 "lines": [{"sku": "MUG-01", "quantity": 2, "unit_price": "8.00"},
           {"sku": "BEANS-1KG", "quantity": "1", "unit_price": 24.5}]}
```

```python
order = parse_order(RAW)
order.lines[1].unit_price           # Decimal('24.5')
order.total                         # Decimal('40.50')

error_summary(BAD)                  # BAD has currency "JPY" and a quantity of 0
# ["currency: Input should be 'GBP', 'EUR' or 'USD'",
#  "lines.0.quantity: Input should be greater than 0"]
error_summary('{"order_id": ')      # ["(body): Invalid JSON: EOF while parsing a value at line 1 column 13"]
```
