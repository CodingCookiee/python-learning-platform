The nightly shipping-rates sync asks a carrier's API for a rate per warehouse. `get_with_retries`
retries **every** failure. When a warehouse code is wrong the carrier answers `404`, and the job
asks four times, sleeping in between, before giving up, for each of 300 bad codes, every night.
The carrier has written to complain, and the job takes an hour longer than it should.

Fix `get_with_retries` so that it only retries failures that might succeed next time:

- transport errors (timeouts, refused or dropped connections): any `httpx.TransportError`,
- the statuses `429`, `500`, `502`, `503` and `504`.

Any other error status raises its `httpx.HTTPStatusError` straight away, with no wait. Everything
else stays as it is: at most `attempts` requests in total, a backoff wait between attempts and
none after the last, and the last error raised when every attempt fails.

```python
get_with_retries(client, "/v1/rates/WH-TYPO", sleep=waits.append)   # HTTPStatusError: 404, one request, no waits
```
