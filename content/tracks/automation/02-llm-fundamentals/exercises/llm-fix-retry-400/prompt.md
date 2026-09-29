`call_with_retries(send, *, max_attempts=3, sleep=time.sleep)` calls `send()` (which returns an
`httpx.Response`) until it succeeds, sleeping 1, 2, 4... seconds between attempts, and raises the
`LLMError` from `error_from_response` if it never does. The errors and `error_from_response` are
in the starter.

The on-call engineer noticed that a prompt that was too long got sent three times, taking seven
seconds to fail, and that an expired key does the same:

```text
POST /v1/messages  400 prompt is too long: 214803 tokens > 200000 maximum
POST /v1/messages  400 prompt is too long: 214803 tokens > 200000 maximum
POST /v1/messages  400 prompt is too long: 214803 tokens > 200000 maximum
```

Fix it so only errors that can succeed later (429 and 5xx) are retried. Anything else raises its
error after the first attempt, without sleeping.

```python
call_with_retries(lambda: http.post("/v1/messages", headers=headers, json=body))
# a 429 then a 200: sleeps 1 second, returns the 200 response
# a 400: raises BadRequestError at once, after one request
```
