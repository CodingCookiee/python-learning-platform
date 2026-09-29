Write the retry loop your adapters will use:
`send_with_retries(send, *, max_attempts=4, base_delay=1.0, max_delay=30.0, sleep=time.sleep)`.
`send` is a function of no arguments that makes one request and returns the `httpx.Response`. The
error classes and `error_from_response` are in the starter.

- A successful response (2xx) is returned.
- A failed response becomes its `LLMError` with `error_from_response`. If httpx raises a
  `TransportError` instead (a timeout, or a connection that failed), that becomes an `LLMTimeout`
  whose `__cause__` is the httpx exception.
- An error that isn't retryable is raised at once. A retryable one is retried, until
  `max_attempts` attempts have been made in all; then the last error is raised.
- Before each retry, `sleep` for the error's `retry_after` if the provider sent one, and otherwise
  `base_delay × 2 ** attempt` (attempt counting from 0), capped at `max_delay`.
- Log one WARNING with `log` (in the starter) before each retry, saying what failed and how long
  you'll wait.

```python
send = lambda: http.post("/v1/messages", headers=headers, json=body)
# the API answers: 429 with retry-after 3, then 500, then 529, then 200
response = send_with_retries(send, sleep=waits.append)
waits      # [3.0, 2.0, 4.0]
response.json()["content"][0]["text"]   # "Order #1042 has shipped."
```
