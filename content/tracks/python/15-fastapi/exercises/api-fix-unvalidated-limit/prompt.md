The warehouse dashboard lists orders a page at a time with `GET /orders?page=2&per_page=20&status=packed`.
Three bug reports have come in, and all three are the same mistake: the endpoint accepts any value
its type allows.

1. "Page 0 shows an empty list instead of an error." (`page=0` makes a negative slice.)
2. "Someone's script asked for `per_page=50000` and the database fell over." It also accepts
   `per_page=0`, which returns nothing.
3. "I typed `status=shiped` and got no orders, so I thought nothing had shipped."

Fix the parameters so that each of these is refused with `422`:

- `page` must be 1 or more (default `1`).
- `per_page` must be from 1 to 100 (default `20`).
- `status` is optional, but when it's given it must be `pending`, `packed` or `shipped`.

```text
GET /orders?page=0             ->  422
GET /orders?per_page=50000     ->  422
GET /orders?status=shiped      ->  422
GET /orders?page=2&per_page=3  ->  200, orders A1004, A1005 and A1006
```

Valid requests must still work exactly as before.
