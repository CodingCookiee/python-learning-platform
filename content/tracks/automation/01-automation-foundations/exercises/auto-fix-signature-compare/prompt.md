`verify_signature(secret, header, body)` checks a `Webhook-Signature` header of the form
`t=<timestamp>,v1=<hex signature>` against the raw `body`, and returns `True` or `False`. It gives
the right answer for good and bad signatures, but a security review flagged two problems:

1. It compares signatures with `==`, which leaks timing information an attacker can use to forge
   a signature one character at a time.
2. A malformed header crashes it, so the endpoint answers `500` and the sender retries the junk:

```python
verify_signature("test-secret-agency", "garbage", b"{}")
# ValueError: dictionary update sequence element #0 has length 1; 2 is required
```

Fix both. A header that can't be parsed, or has no `v1`, returns `False`.
