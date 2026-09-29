Write the full check a receiver runs before trusting a webhook:
`verify_webhook(secret, header, body, now, tolerance=300)`.

- `header` is the `Webhook-Signature` value: `t=<unix seconds>,v1=<hex signature>`. While a
  sender is rotating secrets it signs with both the old and the new one, so the header can carry
  **several** `v1=` entries: `t=1773072000,v1=<old>,v1=<new>`. One valid entry is enough.
- `now` is the receiver's clock in Unix seconds, passed in so tests can control it.
- The signature is HMAC-SHA256, keyed with `secret`, over `f"{t}."` followed by the raw `body`
  bytes, as hex (as in the first drill).

Return `True` if the webhook checks out. Otherwise raise `InvalidWebhook` (provided) with one of
these messages, checked in this order:

| Problem | Message |
|---------|---------|
| no `t`, a `t` that isn't an integer, or no `v1` at all | `"malformed signature header"` |
| `t` more than `tolerance` seconds before or after `now` | `"timestamp outside tolerance"` |
| no `v1` matches | `"signature mismatch"` |

```python
verify_webhook("test-secret-agency", header, body, now=1773072000 + 60)    # True
verify_webhook("test-secret-agency", header, body, now=1773072000 + 3600)
# InvalidWebhook: timestamp outside tolerance
```

Compare signatures in constant time.
