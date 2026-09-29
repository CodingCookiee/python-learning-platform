Write `idempotency_key(tool_name, arguments)`, which gives the same key for the same tool call, so a
write that's repeated can be recognised and skipped.

The key is the tool name, a colon, and the first 16 hex characters of the SHA-256 of the arguments
as canonical JSON: keys sorted, no spaces (`separators=(",", ":")`), and anything JSON can't
represent turned into a string. So the same arguments in a different order give the same key, and
any change to a value gives a different one.

```python
idempotency_key("book_appointment", {"practitioner": "Patel", "start": "2026-10-01T14:30"})
# "book_appointment:" followed by 16 hex characters

idempotency_key("book_appointment", {"start": "2026-10-01T14:30", "practitioner": "Patel"})
# the same key
```
