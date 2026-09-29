You're writing the sending side, so the agency's own tools can post signed events to client
systems. Write `sign_webhook(secret, timestamp, body)` that returns the value of the
`Webhook-Signature` header:

- `secret` is a `str`, `timestamp` an `int` (Unix seconds) and `body` the raw `bytes` being sent;
- the signed message is the timestamp, a `.`, then the body;
- the signature is the HMAC-SHA256 of that message, keyed with the secret, as lowercase hex;
- the header is `t=<timestamp>,v1=<signature>`.

```python
sign_webhook("test-secret-agency", 1773072000, b'{"id":"evt_1042","type":"lead.created"}')
# "t=1773072000,v1=166aabaff8fd6e846db23e08e70c60d4bf72fd2539d3297e94db249333cc704d"
```
