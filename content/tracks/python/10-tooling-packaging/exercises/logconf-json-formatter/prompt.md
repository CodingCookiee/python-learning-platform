The invoicing service is moving to a log collector that wants one JSON object per line. Write a class
`JsonFormatter`, a subclass of `logging.Formatter`, whose `format(record)` returns one line of JSON
with these keys:

| Key | Value |
|-----|-------|
| `time` | when the record was made, in UTC, ISO 8601 with milliseconds and a `Z`: `"2026-09-29T14:05:00.500Z"` |
| `level` | `"INFO"`, `"WARNING"`, ... |
| `logger` | the logger's name |
| `message` | the message with its arguments filled in |
| *extras* | every field passed with `extra={...}`, under its own name |
| `exception` | only when the record has exception info: the formatted traceback |

Values that JSON can't represent, such as a `Decimal` amount, are written as strings.

```python
logger.warning("Card declined for %s", "INV-1042", extra={"order_id": "A-17", "amount": Decimal("25.50")})
```

```json
{"time": "2026-09-29T14:05:00.500Z", "level": "WARNING", "logger": "invoicer.billing", "message": "Card declined for INV-1042", "order_id": "A-17", "amount": "25.50"}
```

It must also work when named in a `dictConfig`, as `"formatters": {"json": {"()": JsonFormatter}}`.
