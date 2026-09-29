Millstone Coffee's wholesale customers place orders through an API, and its support inbox is full
of "it said 500". Build the three order endpoints so every outcome has the right status and a
clear `detail`. Orders live in `orders`, keyed by order id, as dicts of `order_id`, `customer` and
`status` (`"pending"`, `"shipped"` or `"cancelled"`).

| Request | Outcome | Status | `detail` |
|---------|---------|--------|----------|
| `GET /orders/{order_id}` | found | `200`, the order | |
| | missing | `404` | `Order A1099 not found` |
| `POST /orders`, body `{"order_id": ..., "customer": ...}` | created as `"pending"` | `201`, the order | |
| | the id is taken | `409` | `Order A1042 already exists` |
| `POST /orders/{order_id}/cancel` | cancelled | `200`, the order | |
| | already cancelled | `200`, the order, unchanged | |
| | missing | `404` | `Order A1099 not found` |
| | shipped | `409` | `Order A1042 has shipped and can't be cancelled` |

An order id is `A` followed by four digits, such as `A1042`. `OrderCreate` is written for you and
checks that.

```text
GET  /orders/A1099          ->  404 {"detail": "Order A1099 not found"}
POST /orders/A1042/cancel   ->  409 {"detail": "Order A1042 has shipped and can't be cancelled"}
POST /orders/A1043/cancel   ->  200 {"order_id": "A1043", "customer": "Kiln Cafe", "status": "cancelled"}
```
