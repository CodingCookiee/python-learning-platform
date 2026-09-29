The support bot talks to the helpdesk through three functions that each build their own client,
and they've drifted apart: `get_ticket` never checks the status (so a missing ticket comes back as
an error message), and `close_ticket` has no timeout and no `User-Agent`.

Refactor them into one class:

```python
with HelpdeskClient("hd_live_3b1f", transport=transport) as helpdesk:
    helpdesk.get_ticket(4411)        # {"id": 4411, "subject": "Refund not received", "status": "open"}
    helpdesk.list_open_tickets()     # [{"id": 4411, ...}, {"id": 4415, ...}]
    helpdesk.close_ticket(4411)      # {"id": 4411, ..., "status": "closed"}
```

- `HelpdeskClient(api_key, *, transport=None)` creates **one** `httpx.Client`, used by every method,
  with the base URL, the bearer token, `User-Agent: support-bot/2.1` and a timeout of 10 seconds
  (3 to connect).
- Every response's status is checked in one place, so every method raises
  `httpx.HTTPStatusError` for an error status.
- `close()` closes the connection, and the class works as a context manager.
- The three old functions are gone.
