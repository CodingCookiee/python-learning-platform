The nightly export writes every order to the reporting database through one pooled connection,
under a time limit:

```python
async with asyncio.timeout(1800):
    written = await export_orders(db, orders)
```

On a slow night two things go wrong. The time limit passes, but instead of a `TimeoutError` the job
reports success with only half the orders written. And the connection is never given back, so the
pool slowly runs dry and tomorrow's export can't connect at all.

Fix `export_orders` so that:

- a cancelled export stays cancelled, so the caller's `asyncio.timeout` raises `TimeoutError`;
- the connection is released however the export ends: finished, failed or cancelled;
- a finished export still returns the number of orders written, and an error from a write still
  propagates.

Printing a message when it's stopped is fine.
