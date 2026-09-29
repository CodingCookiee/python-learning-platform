The wholesale shop's order form asks for a quote before it places an order. `QuoteRequest` is
written for you. Add `POST /quotes`, which takes a `QuoteRequest` as its JSON body and answers with
the SKU, the quantity and the total in cents.

```text
POST /quotes  {"sku": "BEANS-1KG", "quantity": 3, "unit_price_cents": 1450}
          ->  200 {"sku": "BEANS-1KG", "quantity": 3, "total_cents": 4350}

POST /quotes  {"sku": "BEANS-1KG", "quantity": 0, "unit_price_cents": 1450}
          ->  422
```
