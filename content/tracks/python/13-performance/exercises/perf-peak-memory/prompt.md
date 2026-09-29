Before streaming the nightly export, the team wants to know how much memory each step needs at
its worst. Write `peak_kib(fn, *args)`, which calls `fn(*args)` with `tracemalloc` running and
returns `(result, peak)`:

- `peak` is the most memory allocated at any moment during the call, in KiB (1 024 bytes),
  rounded to one decimal place.
- Tracing is switched on just for the call, and **always** switched off again afterwards, even if
  `fn` raises (in which case the exception propagates).

```python
data, peak = peak_kib(bytearray, 500_000)   # half a million zero bytes
len(data), 488 < peak < 520
# (500000, True)
```

`500_000 / 1024` is about 488.3. The peak is a little higher because Python allocates a few other
small objects along the way, so the tests check a range.
