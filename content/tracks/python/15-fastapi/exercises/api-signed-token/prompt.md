The tour-booking app logs customers in and then sends a token with every request. Build a small
signed token, the same idea as a JWT with fewer parts, and the dependency that checks it.

**The token** has two base64url parts joined by a dot, `<payload>.<signature>`:

- `payload` is `b64url(json.dumps({"sub": customer_id, "exp": <expiry as a Unix timestamp int>}).encode())`.
- `signature` is `b64url(sign(payload))`, where `sign` (in the starter) is HMAC-SHA256 with the
  server's `SECRET`.

`b64url`, `b64url_decode` and `sign` are written for you.

**Write**

- `issue_token(customer_id, expires_at)`, which returns a token for that customer, expiring at the
  `datetime` `expires_at`.
- `current_customer`, a dependency that reads `Authorization: Bearer <token>` and returns the
  token's `sub`. The current time comes from the `get_now` dependency, so tests can pin it.
  `GET /me` already uses it.

Every failure is a `401` with the header `WWW-Authenticate: Bearer`:

| Problem | `detail` |
|---------|----------|
| no `Authorization` header, or not `Bearer <token>` | `Missing bearer token` |
| not two parts, or the signature doesn't match | `Invalid token` |
| `exp` is at or before the current time | `Token expired` |

Check the signature *before* you read anything in the payload, and compare it with
`hmac.compare_digest`.

```python
token = issue_token("cus_ada", datetime(2026, 10, 1, 12, 0, tzinfo=UTC))
# with the clock at 2026-10-01 11:00 UTC
GET /me  Authorization: Bearer <token>      ->  200 {"customer_id": "cus_ada"}
# the same token, with the payload swapped for one that says "cus_grace"
GET /me  Authorization: Bearer <forged>     ->  401 {"detail": "Invalid token"}
# with the clock at 2026-10-01 12:00 UTC
GET /me  Authorization: Bearer <token>      ->  401 {"detail": "Token expired"}
```
