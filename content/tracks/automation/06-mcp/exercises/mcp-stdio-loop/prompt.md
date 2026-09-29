Every hand-written server needs the same transport loop, so write it once, carefully:

```python
serve(handle, stdin, stdout) -> None
```

It reads JSON-RPC messages from `stdin`, one per line, until the end of the input (the client closing
the pipe is how a stdio session ends), and writes replies to `stdout`, one per line.

- **Handle each line as it arrives**, and write its reply before reading the next line. Each reply is
  `json.dumps(reply)` plus `"\n"`, followed by `stdout.flush()`.
- Skip blank lines.
- A line that isn't valid JSON: reply with error `-32700`, `Parse error`, and `"id": None`.
- A JSON array is a batch, which MCP no longer supports: `-32600`,
  `Invalid request: batches are not supported`, `"id": None`. Any other JSON that isn't an object
  (a number, a string): `-32600`, `Invalid request`, `"id": None`.
- Otherwise call `handle(message)` and write its reply, unless it's `None`.
- If `handle` raises, log it with `logger.exception(...)`. For a request, reply `-32603`,
  `Internal error`, with the request's id; for a notification, write nothing. One bad message
  never stops the loop.

```python
stdin = io.StringIO('{"jsonrpc": "2.0", "id": 1, "method": "ping"}\n'
                    'this is not json\n')
stdout = io.StringIO()
serve(handle, stdin, stdout)
stdout.getvalue().splitlines()
# ['{"jsonrpc": "2.0", "id": 1, "result": {}}',
#  '{"jsonrpc": "2.0", "id": null, "error": {"code": -32700, "message": "Parse error"}}']
```
