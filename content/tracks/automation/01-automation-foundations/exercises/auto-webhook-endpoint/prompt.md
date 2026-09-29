Put the whole lesson together. An online shop's payment provider sends order events, and the
refunds team needs every one exactly once. Write `create_app(*, secret, clock, queue, seen)` that
returns a FastAPI app with one route, `POST /webhooks/orders`:

- `secret` is the shared signing secret;
- `clock()` returns the current Unix time in seconds (tests control it);
- `queue` is a list: the receiver's only job is to append each new event's payload there, for a
  worker to process later;
- `seen` is a set of event ids already accepted.

The endpoint answers:

| Situation | Status | Body |
|-----------|--------|------|
| missing, malformed, stale (more than 300 s either way) or wrong signature | `401` | FastAPI's `{"detail": ...}` |
| signed, but not valid JSON, or no `"id"` in the object | `400` | `{"detail": ...}` |
| an event id already in `seen` | `200` | `{"status": "duplicate"}` |
| a new event | `202` | `{"status": "queued"}` |

The signature is in the `Webhook-Signature` header, in the format from the earlier drills.
`verify_webhook` and `InvalidWebhook` from the replay-window drill are provided and work.

```python
queue, seen = [], set()
app = create_app(secret="test-secret-shop", clock=lambda: 1773072000, queue=queue, seen=seen)
# POST a signed {"id": "evt_501", "type": "refund.created", ...}
# 202 {"status": "queued"}, and queue == [that payload]
```

Nothing is queued or recorded for a request that fails any check.
