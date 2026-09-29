`transaction(db)` should run a block of database work so that either all of it happens or none of
it does: commit when the block succeeds, roll back when it raises. Successful payments work, but
when a payment fails halfway, the half-written payment is left in an open transaction, never
committed and never rolled back:

```python
record_payment(db, "A2", 0)   # ValueError, as it should
db.log                         # ["begin", "insert payment A2 0"]   (no rollback)
```

Fix `transaction` so that a failed block is rolled back and its exception still reaches the
caller:

```python
record_payment(db, "A2", 0)   # ValueError
db.log                         # ["begin", "insert payment A2 0", "rollback"]
```

A successful block must still end with `"commit"`, and nothing else in the file needs to change.
