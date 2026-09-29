The analytics team keeps writing the same code: split a big list, send the pieces to a process
pool, and stitch the results back together. Write it once, as
`parallel_map(fn, items, *, workers, map_fn=map)`:

- It returns `[fn(item) for item in items]`, in the same order. `items` can be any iterable.
- It splits the items into `workers` contiguous chunks as even as possible (at most one item
  different, never an empty chunk), and hands **one job per chunk** to `map_fn`, not one per item.
  Sending each item separately to a real pool costs more than the work.
- `map_fn` has the signature of the built-in `map`: `map_fn(function, *iterables)`. On your
  machine you'd pass `pool.map` from a `ProcessPoolExecutor`; the tests pass a fake pool that
  pickles every job and every result, exactly as a real one does.
- A process pool can only send functions it can pickle. If `fn` can't be pickled (a lambda, a
  nested function), raise `TypeError` straight away, with `"top-level"` in the message, instead of
  failing inside the pool.

```python
parallel_map(add_vat, prices, workers=4, map_fn=pool.map)
# [12.0, 6.72, ...]: four jobs of about len(prices) / 4 prices each

parallel_map(lambda price: price * 1.2, prices, workers=4)
# TypeError: fn can't be sent to a worker process: pass a top-level function
```
