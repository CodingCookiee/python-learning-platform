Ops wants every slow job in the nightly run timed, whether it's a block of code or a whole
function. Write `timed_block(label, log, clock=time.perf_counter)` with `@contextmanager`:

- On a normal exit it appends `"<label>: <seconds>s"` to the `log` list, with the elapsed time
  from `clock()` to 2 decimal places.
- If the block raises, it appends `"<label>: failed after <seconds>s"` instead, and the exception
  still reaches the caller.
- Because it's built with `@contextmanager`, it also works as a decorator, logging every call of
  the decorated function.

```python
ticks = iter([0.0, 1.25, 5.0, 5.5])
log = []
with timed_block("export orders", log, clock=lambda: next(ticks)):
    ...                                  # the export
log                                      # ["export orders: 1.25s"]

@timed_block("rebuild index", log, clock=lambda: next(ticks))
def rebuild_index():
    return "rebuilt"

rebuild_index()                          # "rebuilt"
log                                      # ["export orders: 1.25s", "rebuild index: 0.50s"]
```
