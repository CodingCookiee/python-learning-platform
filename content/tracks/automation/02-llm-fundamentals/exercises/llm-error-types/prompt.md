The starter has a small hierarchy of errors, all subclasses of `LLMError`, each with a `retryable`
flag. Write `error_from_response(response)`, which takes a failed `httpx.Response` from either
provider and returns (not raises) the right error:

| Status | Error |
|--------|-------|
| 401, 403 | `AuthenticationError` |
| 429 | `RateLimitError` |
| 500 and above (including 529) | `ServerError` |
| any other 4xx | `BadRequestError` |

- The message is the provider's `error.message` from the JSON body, followed by ` (HTTP <status>)`.
  If the body isn't JSON in that shape (a proxy's HTML error page, say), use the body's text, or
  the status's reason phrase if the body is empty.
- `status` is the status code.
- `retry_after` is the `retry-after` header as a float, or `None` if it's missing or isn't a number.

```python
response = http.post("/v1/messages", headers=headers, json=body)   # rate limited
error = error_from_response(response)
type(error).__name__, error.retryable, error.retry_after
# ("RateLimitError", True, 2.0)
str(error)
# "Number of request tokens has exceeded your per-minute rate limit (HTTP 429)"
```
