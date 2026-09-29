A client sends your server whatever its author thought JSON-RPC was. Before dispatching anything,
the order-desk server checks each message's shape. Write:

```python
check_message(message) -> list[str]
```

It returns the problems it finds, as the exact strings below, in the tables' order, or `[]` for a
valid message.

| Rule | Problem |
|------|---------|
| The message must be a dict (return this problem alone) | `message must be a JSON object` |
| `jsonrpc` must be the string `"2.0"` | `jsonrpc must be "2.0"` |

A message with a `method` is a request or a notification:

| Rule | Problem |
|------|---------|
| `method` is a non-empty string | `method must be a non-empty string` |
| `id`, if present, is a string or an integer (`True` doesn't count as an integer) | `id must be a string or an integer` |
| `params`, if present, is a dict (MCP params are always objects) | `params must be an object` |
| there's no `result` or `error` key | `a request can't have result or error` |

A message without a `method` is a response:

| Rule | Problem |
|------|---------|
| it has an `id` key | `a response needs an id` |
| the `id` is a string or an integer, or `None` in an error response (for a request that couldn't be read) | `id must be a string or an integer` |
| it has exactly one of `result` and `error` | `a response needs result or error`, or `a response can't have both result and error` |
| an `error` is a dict with an integer `code` and a string `message` | `error needs an integer code and a string message` |

```python
check_message({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})       # []
check_message({"jsonrpc": "2.0", "id": True, "method": "tools/list", "params": ["1042"]})
# ["id must be a string or an integer", "params must be an object"]
```
