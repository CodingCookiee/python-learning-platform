The accounts ledger must be locked while a batch of entries is posted, so two batches can't
interleave. If a batch ever leaves it locked, every later batch waits forever.

Write `post_batch(ledger, entries)`:

- call `ledger.lock()`, then `ledger.post(entry)` for each entry in order,
- always call `ledger.unlock()` afterwards, whether posting succeeded or not,
- return the number of entries posted.

If `post` raises, the error must reach the caller unchanged (the ledger has already refused the
entry; your job is only to unlock). If `lock` itself raises, the ledger was never locked, so don't
unlock it.

```python
ledger = Ledger()                  # the tests provide one
post_batch(ledger, [120, 45, 80])  # 3
ledger.locked                      # False
post_batch(ledger, [60, 0, 15])    # raises ValueError: the ledger refuses a zero entry
ledger.locked                      # False, and 60 was posted
```
