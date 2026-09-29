A package installer downloads each file from whichever mirror answers first. Write
`fastest(mirrors, path)`:

- Each mirror has a `name` and a coroutine method `get(path)` that returns the file's contents, or
  raises if that mirror is broken.
- Send the request to every mirror **at the same time**, and return `(name, body)` from the first
  mirror that succeeds. A mirror that fails is skipped, and the race goes on.
- As soon as there's a winner, cancel the other requests, and wait for them to stop: when `fastest`
  returns, no request is still running.
- If every mirror fails, raise `ExceptionGroup("every mirror failed", errors)` with all their
  exceptions (module 6).
- If `fastest` itself is cancelled, every request it started is cancelled too.

`mirrors` is never empty.

```python
await fastest([eu_west, us_east, ap_south], "/simple/httpx/httpx-0.28.1.tar.gz")
# ("us-east", b"...")       us-east answered first; eu-west and ap-south were cancelled
```
