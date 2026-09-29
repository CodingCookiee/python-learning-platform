The CRM's API allows 100 requests a minute. When the sync goes over, the CRM answers `429` with
`Retry-After: 20`, and the sync retries after half a second, then one second, then two, gets
`429` every time, and gives up long before the 20 seconds are up. Twice last week the CRM suspended
the API key for ignoring `Retry-After`.

Fix `get_with_retries` so that, when a response is worth retrying:

- if it has a `Retry-After` header (the starter's `retry_after` helper reads it), it waits exactly
  that long instead of the backoff,
- if it hasn't, it waits with the backoff, as now,
- if `Retry-After` asks for more than `max_wait` seconds, it doesn't wait at all: it raises the
  `httpx.HTTPStatusError` straight away, so the job can try again in its next run.

Everything else stays as it is.

```python
get_with_retries(client, "/v1/contacts", sleep=waits.append)   # 429 Retry-After: 20, then 200
waits                                                          # [20.0]
```
