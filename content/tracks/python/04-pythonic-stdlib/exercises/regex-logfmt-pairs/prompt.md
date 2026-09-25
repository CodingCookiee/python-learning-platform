Many services write structured logs as `key=value` pairs, where values with spaces are quoted:

```text
level=error msg="disk full on /var" host=web-2 retries=3
```

Write `parse_fields(line)` that returns the pairs as a dict of strings, in the order they appear:

```python
parse_fields('level=error msg="disk full on /var" host=web-2 retries=3')
# {"level": "error", "msg": "disk full on /var", "host": "web-2", "retries": "3"}
```

- Keys are letters, digits and underscores.
- A quoted value runs to the next `"`, and may contain spaces and `=` signs. The quotes aren't part
  of the value.
- A bare value runs to the next space, and may be empty (`user=`).
- Words that aren't part of a pair are ignored. If a key appears twice, the last value wins.
