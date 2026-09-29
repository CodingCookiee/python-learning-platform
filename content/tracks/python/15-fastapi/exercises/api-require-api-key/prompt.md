Partners pull their delivery schedules from the roastery's API with an API key in the `X-API-Key`
header. Write the `current_partner` dependency, which `GET /deliveries` already uses:

- With a key from `API_KEYS`, it returns that partner's name.
- With no `X-API-Key` header, it raises `401` with the detail `Missing API key`.
- With any other key, it raises `401` with the detail `Invalid API key`.
- Both `401`s carry the header `WWW-Authenticate: ApiKey`.
- Compare keys with `secrets.compare_digest`, not `==`.

`GET /health` stays open to everyone.

```text
GET /deliveries  (no key)                          ->  401 {"detail": "Missing API key"}
GET /deliveries  X-API-Key: pk_live_guess          ->  401 {"detail": "Invalid API key"}
GET /deliveries  X-API-Key: pk_live_kiln_7f3a9c    ->  200 {"partner": "Kiln Cafe", "deliveries": [...]}
```
