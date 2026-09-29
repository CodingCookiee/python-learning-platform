Write your own version of `contextlib.contextmanager`, without importing it. `my_contextmanager`
decorates a generator function, and calling the decorated function returns a
`GeneratorContextManager` wrapping a new generator:

- **`__enter__`** runs the generator to its first `yield` and returns the yielded value. If the
  generator finishes without yielding, raise `RuntimeError("generator didn't yield")`.
- **`__exit__` with no exception** resumes the generator, which should then finish. If it yields
  again, raise `RuntimeError("generator didn't stop")`.
- **`__exit__` with an exception** throws the exception into the generator at its `yield`:
  - if the generator catches it and finishes, the exception is suppressed;
  - if the exception comes back out, it carries on to the caller unchanged;
  - if the generator raises a different exception, that one reaches the caller;
  - if the generator yields again, raise `RuntimeError("generator didn't stop after throw()")`.
- The decorated function keeps its name and docstring.

```python
@my_contextmanager
def connection(dsn, events):
    """Open a connection for the length of a with block."""
    events.append("connect")
    try:
        yield f"conn:{dsn}"
    finally:
        events.append("disconnect")

events = []
with connection("orders-db", events) as conn:
    events.append(f"query on {conn}")
events   # ["connect", "query on conn:orders-db", "disconnect"]
```
