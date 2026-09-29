Build the helpdesk client properly. The starter has the models (`Ticket`, `Comment`), the
exception hierarchy and `error_from_response` from the earlier drills. Write the class:

```python
HelpdeskClient(api_key, *, transport=None, max_attempts=3, sleep=time.sleep)
```

**Connection.** One `httpx.Client` with base URL `https://api.helpdesk.example/v2`,
`Authorization: Bearer <api_key>` and a timeout of 10 seconds (3 to connect). `close()`, and use as
a context manager.

**`_request(method, path, **kwargs)`**, the only method that sends anything:

- returns the response when the status is `2xx`,
- for an error status, raises `error_from_response(response)`, so no httpx exception ever escapes,
- raises `HelpdeskConnectionError`, from the httpx exception, when there's no response at all,
- retries `GET` requests (and only `GET`: the others aren't idempotent) up to `max_attempts` in
  all, on transport errors and on `429`, `500`, `502`, `503` and `504`. Before each retry it calls
  `sleep` with the `Retry-After` seconds of a `429` that has them, otherwise `2 ** attempt`
  (1, then 2).

**The API, as typed methods:**

| Method | Request | Returns |
|--------|---------|---------|
| `get_ticket(ticket_id)` | `GET /tickets/<id>` | a `Ticket` |
| `iter_tickets(status="open")` | `GET /tickets?status=<status>&limit=100`, then `&cursor=<next_cursor>` until `next_cursor` is `null`; the body is `{"tickets": [...], "next_cursor": ...}` | a lazy iterator of `Ticket` |
| `add_comment(ticket_id, body, *, public=True)` | `POST /tickets/<id>/comments` with JSON `{"body": ..., "public": ...}` | a `Comment` |

```python
with HelpdeskClient("hd_live_3b1f", transport=transport, sleep=waits.append) as helpdesk:
    helpdesk.get_ticket(4411)                  # Ticket(id=4411, subject="Refund not received", ...)
    [t.id for t in helpdesk.iter_tickets()]    # [4411, 4415, 4418]
    helpdesk.add_comment(4411, "Refund issued today.").id   # "cm_1"
    helpdesk.get_ticket(9999)                  # NotFoundError: HTTP 404: ticket 9999 not found
```
