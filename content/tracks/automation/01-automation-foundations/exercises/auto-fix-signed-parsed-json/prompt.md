The agency's FastAPI receiver for form submissions passed all its tests, which signed their
bodies with `json.dumps`. Pointed at the real form tool, every delivery got a `401`:

```python
# What the form tool sends: compact JSON, signed over exactly these bytes
body = b'{"form":"contact","email":"amira@example.com","name":"Amira Haddad"}'
await client.post("/webhooks/forms", content=body, headers={"Webhook-Signature": sign(body)})
# 401 {"detail": "bad signature"}
```

Fix the endpoint so it:

- verifies the signature over the **raw request body**, exactly as received;
- answers `401` for a missing or wrong signature, without storing anything;
- answers `400` for a correctly signed body that isn't valid JSON;
- appends the parsed payload to `received` and answers `200 {"ok": true}` otherwise.

The signature header is `t=<timestamp>,v1=<hex HMAC-SHA256 of "t." + body>`, as in the earlier
drills. (Timestamp tolerance is left out here to keep the drill focused.)
