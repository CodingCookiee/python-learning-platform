Write `log_line(level, message, **fields)` that formats one line for a structured log: the level in
capitals, the message, then each field as `key=value` in the order it was passed. A value whose text
contains a space is wrapped in double quotes.

```python
log_line("warning", "disk nearly full", host="web-1", used="93%")
# 'WARNING disk nearly full host=web-1 used=93%'

log_line("info", "login", user="Ada Lovelace", attempts=2)
# 'INFO login user="Ada Lovelace" attempts=2'
```

The fields can be called anything, **including `message` and `level`**. This must work:

```python
log_line("info", "email sent", message="welcome back", level="gold")
# 'INFO email sent message="welcome back" level=gold'
```

With an ordinary signature that call raises `TypeError`. Choose a signature where it doesn't.
