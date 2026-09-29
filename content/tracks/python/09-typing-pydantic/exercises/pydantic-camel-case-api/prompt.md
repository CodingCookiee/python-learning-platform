The shipping partner's API speaks camelCase JSON (`trackingNumber`, `estimatedDelivery`), and your
Python code should keep its snake_case names. Write a `ShipmentUpdate` model that translates at the
edges, and two functions:

| Field | Type | Default |
|-------|------|---------|
| `tracking_number` | str | required |
| `carrier` | str | required |
| `status` | `"label_created"`, `"in_transit"` or `"delivered"` | required |
| `estimated_delivery` | `date` or None | `None` |
| `signed_by` | str or None | `None` |

- The model accepts the camelCase names from JSON, **and** the snake_case names in Python code:
  `ShipmentUpdate(tracking_number="RA123", carrier="DHL", status="in_transit")` must work.
- `parse_update(raw: str) -> ShipmentUpdate` parses the partner's JSON.
- `to_api(update: ShipmentUpdate) -> str` returns camelCase JSON for the partner, leaving out
  fields that are `None`.

```python
update = parse_update('{"trackingNumber": "RA123", "carrier": "DHL", "status": "delivered", "signedBy": "A. Lovelace"}')
update.signed_by        # "A. Lovelace"
to_api(update)          # '{"trackingNumber":"RA123","carrier":"DHL","status":"delivered","signedBy":"A. Lovelace"}'
```
