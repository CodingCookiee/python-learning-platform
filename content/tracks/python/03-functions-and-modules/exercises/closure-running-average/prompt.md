A monitoring agent reports API response times one at a time. Write `make_averager()` that returns a
function `record`:

- `record(ms)` adds a response time and returns the average of every time so far, rounded to 1
  decimal place.
- `record()` with no argument returns the current average without adding anything, or `None` if
  nothing has been recorded yet.

```python
api = make_averager()
api(120)      # 120.0
api(80)       # 100.0
api(95)       # 98.3
api()         # 98.3
```

Each averager keeps its own figures, and there should be no global variables.
