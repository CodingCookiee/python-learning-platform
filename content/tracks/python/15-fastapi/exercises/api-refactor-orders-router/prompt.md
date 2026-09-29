The order service's four order routes each repeat the same `/orders` prefix and the same API-key
check, and the last route someone added forgot the check. (It's the `/orders/{order_id}/invoice`
route: anyone can download anyone's invoice.)

Refactor the order routes into an `APIRouter` called `orders_router` that holds the shared
settings once:

- the prefix `/orders`,
- the OpenAPI tag `orders` (currently missing from the docs),
- the `require_api_key` dependency, so every order route is protected, including the invoice.

Include it in `app`. The paths, responses and status codes all stay the same, and `GET /health`
stays open to everyone.

```text
GET /orders/A1042/invoice   (no key)             ->  401 (it was 200)
GET /orders/A1042           X-API-Key: ok-key-1  ->  200, as before
GET /health                                      ->  200, as before
```
