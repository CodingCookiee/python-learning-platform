The on-call dashboard shows the first few slow requests from a live log. Each line is
`path status milliseconds`, like `"/pay 200 1840"`. Build it as a pipeline of three pieces:

- `parse_requests(lines)` is a generator that yields `(path, status, ms)` tuples, with `status`
  and `ms` as ints. It skips any line that doesn't have exactly three fields or whose status or ms
  isn't a whole number.
- `slow(requests, threshold_ms)` yields only the requests that took **more** than `threshold_ms`.
- `first_slow_paths(lines, threshold_ms, n)` returns a list of the paths of the first `n` slow
  requests.

The log is still being written, so `lines` may never end. The pipeline must stop reading as soon as
it has `n` results.

```python
log = ["/home 200 45", "/pay 200 1840", "garbage", "/cart 200 90", "/search 200 1200", "/pay 502 3000"]
first_slow_paths(log, 1000, 2)   # ["/pay", "/search"]
```
