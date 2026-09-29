`timeit` is great in a notebook, but a team benchmark script wants something smaller that it can
test. Write `time_it(fn, *, number=1, repeat=5, clock=time.perf_counter)`, a tiny `timeit.repeat`
that returns the best time **per call**, in seconds:

- Run `repeat` rounds. In each round, read the clock once, call `fn()` `number` times, and read
  the clock once more. (Reading the clock around each single call would add the clock's own cost
  to every call.)
- A round's time per call is its elapsed time divided by `number`.
- Return the smallest time per call from all the rounds.
- Raise `ValueError` if `number` or `repeat` is less than 1.

```python
readings = iter([0.0, 3.0, 10.0, 12.0, 20.0, 26.0])
time_it(lambda: None, number=2, repeat=3, clock=lambda: next(readings))
# 1.0   (the rounds took 3.0, 2.0 and 6.0 seconds for 2 calls each)
```
