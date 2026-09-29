Write the helpdesk client's exceptions, and the function that picks the right one for an error
response.

```text
HelpdeskError
├── HelpdeskApiError            .message, .status_code, .request_id
│   ├── BadRequestError         400, 422
│   ├── AuthenticationError     401, 403
│   ├── NotFoundError           404
│   ├── RateLimitError          429, with .retry_after
│   └── ServerError             500-599
└── HelpdeskConnectionError
```

- `HelpdeskApiError(message, *, status_code, request_id=None)` keeps all three as attributes, and
  its `str()` is `"HTTP 404: ticket 9999 not found"`.
- `RateLimitError` takes the same arguments plus `retry_after=None`.
- `HelpdeskConnectionError` needs nothing extra.

`error_from_response(response)` returns (doesn't raise) the right exception for an error response:

- the class from the tree above; any other `4xx` is a plain `HelpdeskApiError`,
- the message from the API's JSON body, `{"error": {"message": "..."}}`, or the response's reason
  phrase (`"Bad Gateway"`) when the body isn't like that,
- the `X-Request-Id` header as `request_id` (or `None`),
- for a `RateLimitError`, `retry_after` from a `Retry-After` header of whole seconds, as a float, or
  `None`.

```python
error = error_from_response(httpx.Response(404, json={"error": {"message": "ticket 9999 not found"}}, headers={"X-Request-Id": "req_8f2a"}))
type(error).__name__, str(error), error.request_id   # ("NotFoundError", "HTTP 404: ticket 9999 not found", "req_8f2a")
```
