The CRM sync fails now and then with a dropped connection, and trying again a moment later usually
works. Write a decorator factory:

```python
retry(times=3, *, exceptions=(ConnectionError, TimeoutError), delay=0.5, sleep=time.sleep)
```

- `times` is the total number of attempts. A `times` below 1 raises `ValueError` straight away,
  when `retry(...)` is called.
- If the function raises one of `exceptions`, wait and try again. The waits double each time:
  `delay`, then `delay * 2`, then `delay * 4`, and so on. Waiting means calling `sleep(seconds)`,
  so tests can pass a fake.
- If the last attempt fails too, re-raise that exception. Don't wait after the last attempt.
- Any other exception is raised immediately, with no retry.
- The decorated function keeps its name and docstring, and returns what the original returns.

```python
waits = []

@retry(times=4, sleep=waits.append)
def sync_customers():
    ...   # fails twice with ConnectionError, then returns "synced 120"

sync_customers()   # "synced 120"
waits              # [0.5, 1.0]
```
