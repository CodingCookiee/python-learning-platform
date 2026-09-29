A `Retry-After` header comes in two forms: a whole number of seconds (`Retry-After: 120`) or an
HTTP date (`Retry-After: Wed, 30 Sep 2026 12:00:00 GMT`). Write
`retry_after(response, *, now)` that turns either into a number of seconds to wait, as a float.
`now` is a timezone-aware `datetime` (tests pass a fixed one).

| `Retry-After` | Returns |
|---------------|---------|
| missing | `None` |
| a whole number of seconds, maybe with spaces around it | that number, as a float |
| an HTTP date in the future | the seconds from `now` until then |
| an HTTP date in the past | `0.0` |
| anything else (`"soon"`, `"-5"`, `"1.5"`) | `None` |

```python
now = datetime(2026, 9, 30, 11, 59, 30, tzinfo=timezone.utc)
retry_after(httpx.Response(429, headers={"Retry-After": "120"}), now=now)                            # 120.0
retry_after(httpx.Response(503, headers={"Retry-After": "Wed, 30 Sep 2026 12:00:00 GMT"}), now=now)  # 30.0
retry_after(httpx.Response(429), now=now)                                                            # None
```
