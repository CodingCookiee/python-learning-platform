Write `logging_config(stream, verbose=False)`, which returns the dict the invoicing app passes to
`logging.config.dictConfig` at the start of `main()`. Once applied:

- Every message at `INFO` or above, from any logger, is written to `stream` as
  `LEVEL name: message`, one per line. With `verbose=True`, `DEBUG` messages are written too.
- The `httpx` and `httpcore` loggers only get through at `WARNING` and above, even when verbose:
  their `INFO` lines are request-by-request noise.
- Loggers that modules created **before** the config was applied keep working.

```python
import io
import logging
import logging.config

stream = io.StringIO()
logging.config.dictConfig(logging_config(stream))
logging.getLogger("invoicer.billing").info("Charging INV-1042")
logging.getLogger("invoicer.billing").debug("Card token tok_4242")
logging.getLogger("httpx").info("HTTP Request: POST https://api.example.com/charges")
stream.getvalue()
# "INFO invoicer.billing: Charging INV-1042\n"
```
