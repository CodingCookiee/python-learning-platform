The CRM export was moved from a blocking database driver to an async one. The function became
`async def`, but its body didn't change, and it fails on the first line:

```python
await export_customers(db, sink)
# TypeError: 'contextlib._AsyncGeneratorContextManager' object does not support the context manager
# protocol (missed __exit__ method) but it supports the asynchronous context manager protocol.
# Did you mean to use 'async with'?
```

In the new driver, `db.connect()` is an async context manager, `conn.stream(query)` is an async
generator of rows, and `sink.write(row)` is a coroutine function. Fix `export_customers` so it
writes every row to the sink, returns how many it wrote, and releases the connection when it's
done.

```python
await export_customers(db, sink)     # 3
sink.rows     # [(1, "ada@example.com"), (2, "grace@example.com"), (4, "linus@example.com")]
```
