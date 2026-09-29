Call counts are the one part of a profile that's exact and repeatable, so they're what a test can
check. Write `most_called(fn, *args, n=3)`. It runs `fn(*args)` under `cProfile` and returns the
`n` functions that were called most often, as a list of `(name, calls)` tuples:

```python
def is_valid(line):
    return line.count(",") == 2

def parse(line):
    sku, quantity, price = line.split(",")
    return sku, int(quantity), float(price)

def load(lines):
    return [parse(line) for line in lines if is_valid(line)]

lines = ["MUG-01,2,8.50", "oops", "LAMP-02,1,24.00", "MUG-01,1,8.50"]
most_called(load, lines, n=2)
# [('is_valid', 4), ('parse', 3)]
```

- Profile only the call itself: switch the profiler on just before `fn` runs and off straight
  after, so none of the profiler's own code is counted. (A `with` block would count its `__exit__`.)
- Count only functions written in Python. Leave out built-ins such as `str.split` and `int`,
  which `pstats` reports with the file name `~`.
- For a recursive function, count every call: `5/1` means 5.
- Most calls first; functions with the same count in alphabetical order.
- If `fn` raises, let the exception propagate, but make sure the profiler is switched off first.
  (Only one profiler can run at a time, so one left on breaks the next profile.)
