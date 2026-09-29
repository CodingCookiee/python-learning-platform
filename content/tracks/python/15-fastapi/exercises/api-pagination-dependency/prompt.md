The accounts service lists customers and invoices, and both lists have grown too long to send in
one response. Write one `pagination` dependency and use it in both endpoints.

- `pagination` reads two query parameters: `offset` (0 or more, default `0`) and `limit` (1 to 50,
  default `10`). It returns a `Page` (the dataclass in the starter).
- `GET /customers` and `GET /invoices` each answer `{"total": ..., "items": [...]}`: `total` is the
  length of the whole list, and `items` is the requested slice.

```text
GET /invoices?offset=50&limit=5   ->  {"total": 57, "items": [<INV-0051>, ..., <INV-0055>]}
GET /customers                    ->  {"total": 23, "items": [<the first 10 customers>]}
GET /customers?limit=100          ->  422
```
