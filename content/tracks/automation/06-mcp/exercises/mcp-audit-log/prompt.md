Kiln & Co's data protection lead will only sign off on the order server if every access is on
record. Write a wrapper that adds an audit log to any handler without changing what it does:

```python
audited(handle, logger, *, clock=time.monotonic) -> handle
```

The returned function passes every message to `handle` and returns its reply unchanged. Along the
way:

- It works out the client's name **for each request on its own**: the name in that request's
  `params["_meta"]["io.modelcontextprotocol/clientInfo"]`, if there is one. An older client sends no
  `_meta`, so for its requests use the `clientInfo` name from the `initialize` request seen earlier
  on this wrapper, and `"unknown"` if there hasn't been one.
- For every **request** whose method is `tools/call` or `resources/read`, it logs one `INFO`
  record on `logger` whose message is `json.dumps(entry)`, with:

| Key | Value |
|-----|-------|
| `client` | the client's name |
| `method` | `tools/call` or `resources/read` |
| `target` | the tool's `name`, or the resource's `uri` |
| `arguments` | the tool's arguments, with the value of any key in `SENSITIVE` replaced by `"[redacted]"` (`{}` for `resources/read`) |
| `outcome` | `"protocol_error"` if the reply has an `error`, `"tool_error"` if its result has `isError: true`, otherwise `"ok"` |
| `ms` | the time `handle` took, `round((end - start) * 1000)`, measured with `clock()` |

- If `handle` raises, the entry's outcome is `"exception"`, and the exception is re-raised after
  it's logged.

Nothing else is logged, and the arguments in the message passed to `handle` are not changed.

```python
ticks = iter([100.0, 100.012])          # a clock for the example: the call takes 12 ms
client = McpHarness(audited(handle, logger, clock=lambda: next(ticks)), protocol="2026-07-28")
                                        # the harness's clientInfo name is "pylearn-test"
client.call_tool("get_order", {"order_id": "1042"})
# logs {"client": "pylearn-test", "method": "tools/call", "target": "get_order",
#       "arguments": {"order_id": "1042"}, "outcome": "ok", "ms": 12}
```
