An integration's error handler needs to decide what to do about each response. Write
`advice(status_code)` that returns one of these strings:

| Status code | Returns |
|-------------|---------|
| 200–299 | `"done"` |
| 300–399 | `"follow the redirect"` |
| 401 or 403 | `"check the credentials"` |
| 429 | `"slow down and retry"` |
| any other 400–499 | `"fix the request"` |
| 500–599 | `"retry later"` |

Any other number raises `ValueError` (httpx never hands your code a `1xx` response).

```python
advice(201)    # "done"
advice(404)    # "fix the request"
advice(503)    # "retry later"
```
