An audit of the wholesale order API found three orders like this one, all placed with Harbour
Freight's API key:

```json
{"customer_id": "kiln-cafe", "sku": "BEANS-1KG", "quantity": 40, "unit_price_cents": 1}
```

Forty kilos of coffee for 40 cents, billed to a different customer. The endpoint validates types,
but it believes whatever the body says. Fix it:

- The customer is the one the API key belongs to (the `current_customer` dependency already works).
- The price comes from `CATALOGUE`, in cents per unit.
- The body may contain only `sku` and `quantity`. Any other key, such as `customer_id` or
  `unit_price_cents`, is refused with `422`.
- A SKU that isn't in the catalogue is refused with `422` and the detail `Unknown SKU: <sku>`.
- A refused order stores nothing.

```text
POST /orders  X-API-Key: ck_kiln_51f0  {"sku": "MUG-01", "quantity": 3}
          ->  201 {"id": 1, "customer_id": "kiln-cafe", "sku": "MUG-01", "quantity": 3, "total_cents": 2400}

POST /orders  X-API-Key: ck_harbour_9a2e  {"sku": "BEANS-1KG", "quantity": 40, "unit_price_cents": 1}
          ->  422
```
