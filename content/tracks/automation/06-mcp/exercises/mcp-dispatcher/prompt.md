Every server so far has repeated the same envelope code. Kiln & Co will run three MCP servers
(orders, wiki, appointments), so write the dispatcher once. Methods register with decorators, and
`handle` does all the JSON-RPC work:

```python
rpc = Dispatcher()

@rpc.method("tools/list")
def list_tools(params):
    return {"tools": []}

@rpc.notification("notifications/cancelled")
def cancelled(params):
    ...

rpc.handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
# {"jsonrpc": "2.0", "id": 1, "result": {"resultType": "complete", "tools": []}}
```

`method(name)` and `notification(name)` are decorators that register the function and return it
unchanged. A handler takes the params dict and returns the result. `handle(message)` works through
these rules in order:

1. **Invalid request.** If the message isn't a dict, its `jsonrpc` isn't `"2.0"`, or its `method`
   isn't a non-empty string: error `-32600`, `Invalid request`. The reply's `id` is the message's
   `id` if it's a string or an integer (not a bool), otherwise `None`.
2. **Notification** (no `id`): run its registered handler, if any, and return `None`. If the handler
   raises, log it with `logger.exception(...)` and still return `None`.
3. **Unknown method:** `-32601`, `Method not found: <method>`.
4. **Params** that are present but not a dict: `-32602`, `Invalid params: params must be an object`.
   Missing params are passed as `{}`.
5. **Call the handler.** If it raises `InvalidParams`, reply `-32602` with
   `Invalid params: <the exception's message>`. If it raises anything else, reply `-32603` with
   exactly `Internal error` (the exception's text must not reach the client) and log it with
   `logger.exception(...)`, mentioning the method. Otherwise reply with the result, adding
   `"resultType": "complete"` unless the handler's result already has a `resultType`.

The starter defines `logger` and `InvalidParams`.
