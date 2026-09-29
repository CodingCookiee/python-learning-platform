Posting half of a batch of ledger entries is worse than posting none of them. Make `Transaction`
a context manager that posts all of a block's entries, or none:

- `with Transaction(ledger) as tx:` gives you the transaction itself. `ledger` is a list.
- Inside the block, `tx.add(entry)` queues an entry; nothing reaches the ledger yet.
- If the block finishes normally, every queued entry is appended to `ledger`, in order, and
  `tx.committed` becomes `True`.
- If the block raises, nothing is added to the ledger, `tx.committed` stays `False`, and the
  exception carries on to the caller.
- Calling `add` when the transaction isn't open (before the block, or after it) raises
  `RuntimeError("transaction is not open")`.

```python
ledger = []
with Transaction(ledger) as tx:
    tx.add(("rent", -950))
    tx.add(("salary", 2450))
ledger          # [("rent", -950), ("salary", 2450)]
tx.committed    # True

with Transaction(ledger) as tx:
    tx.add(("refund", 20))
    raise ValueError("card declined")   # the ValueError reaches the caller
ledger          # unchanged
```
