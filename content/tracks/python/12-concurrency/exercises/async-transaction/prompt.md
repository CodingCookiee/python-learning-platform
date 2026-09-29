The payments service moves money between accounts with an async database driver, and every
transfer must be all or nothing. Write `transaction(conn)`, an async context manager:

- On entry it runs `await conn.execute("BEGIN")`, and `async with ... as` gives back `conn`.
- If the block finishes, it runs `await conn.execute("COMMIT")`.
- If the block raises, it runs `await conn.execute("ROLLBACK")` and lets the exception propagate.
- If the task running the block is **cancelled** (a timeout, a TaskGroup shutting down), that's a
  rollback too, and the cancellation carries on.

```python
async with transaction(conn) as tx:
    await tx.execute("UPDATE accounts SET balance = balance - 40 WHERE id = 7")
    await tx.execute("UPDATE accounts SET balance = balance + 40 WHERE id = 9")
conn.log
# ["BEGIN", "UPDATE accounts SET ... id = 7", "UPDATE accounts SET ... id = 9", "COMMIT"]
```
