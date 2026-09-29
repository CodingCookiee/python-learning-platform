Kiln & Co's order-desk server logs every message it sees, grouped by kind. Write:

```python
message_kind(message: dict) -> str
```

It returns one of four strings:

- `"request"`: it has a `method` and an `id`;
- `"notification"`: it has a `method` and no `id`;
- `"error"`: it has no `method` and has an `error`;
- `"result"`: anything else with no `method` (a successful response).

A message whose `jsonrpc` isn't exactly `"2.0"` (or is missing) isn't JSON-RPC 2.0 at all: raise
`ValueError("Not a JSON-RPC 2.0 message")`.

```python
message_kind({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})                # "request"
message_kind({"jsonrpc": "2.0", "method": "notifications/initialized"})          # "notification"
message_kind({"jsonrpc": "2.0", "id": 1, "result": {"tools": []}})               # "result"
message_kind({"jsonrpc": "2.0", "id": 2, "error": {"code": -32601, "message": "Method not found"}})  # "error"
```
