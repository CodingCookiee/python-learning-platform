The last thing the shop server does before any text leaves it is remove every secret it knows about.
Write:

```python
redact(text: str, secrets: list[str | None]) -> str
```

Replace every occurrence of each secret in `text` with `[redacted]`. Secrets that are `None` or empty
are skipped (an unset environment variable must not redact every gap between characters). When one
secret contains another, the longer one is replaced whole.

```python
redact("GET /sync?token=tk_9f2c81 failed", ["tk_9f2c81"])
# "GET /sync?token=[redacted] failed"
```
