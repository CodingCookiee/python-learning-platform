The checkout charges a card through the payments API. When the call times out, nobody knows
whether the customer was charged, so right now it doesn't retry at all and support refunds by
hand. The payments API supports idempotency keys. Write:

```python
create_charge(client, amount, currency, customer, *, idempotency_key=None, attempts=3,
              sleep=time.sleep, new_key=new_idempotency_key)
```

- It sends `POST /v1/charges` with the JSON body `{"amount": ..., "currency": ..., "customer": ...}`
  and an `Idempotency-Key` header, and returns the charge (the response's JSON).
- The key is `idempotency_key` if one is given, otherwise `new_key()` (a fresh UUID), called
  **once** per `create_charge` call. Every attempt of that call sends the same key and body.
- It retries, up to `attempts` in total, on transport errors (a timeout might have been processed)
  and on `429`, `500`, `502`, `503` and `504`, waiting 1 second, then 2, then 4, with `sleep`.
- Any other error status (a declined card is `402`) raises `httpx.HTTPStatusError` straight away.
  When every attempt fails, the last error is raised.

```python
charge = create_charge(client, 4200, "gbp", "cus_ada", sleep=waits.append)
# the first attempt was processed, but its response was lost; the retry sent the same key
charge    # {"id": "ch_1", "amount": 4200, "currency": "gbp", "customer": "cus_ada"}
waits     # [1]
```
