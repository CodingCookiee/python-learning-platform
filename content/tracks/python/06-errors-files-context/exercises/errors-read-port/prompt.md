A service reads its settings from a config file into a dict of strings. Write
`read_port(settings)` that returns the `port` setting as an `int`, and turns every problem into a
`ValueError` the operator can act on:

| Problem | Message | Chained to |
|---------|---------|------------|
| no `port` key | `missing setting: port` | the `KeyError` |
| not a whole number | `port must be a whole number, got '<text>'` | the `ValueError` from `int()` |
| outside 1 to 65535 | `port <n> is out of range 1-65535` | nothing |

```python
read_port({"host": "db.internal", "port": "5432"})   # 5432
read_port({"host": "db.internal"})                    # ValueError: missing setting: port
read_port({"port": "eighty"})                          # ValueError: port must be a whole number, got 'eighty'
read_port({"port": "70000"})                           # ValueError: port 70000 is out of range 1-65535
```

"Chained to" means the original exception is the new one's `__cause__`, so the traceback still
shows where it came from.
