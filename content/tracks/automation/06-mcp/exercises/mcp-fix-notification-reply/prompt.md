The staff wiki's MCP server works in the MCP Inspector, but a stricter client disconnects the first
time a user stops a slow request, with "received a response to an unknown request". The server
answers everything, including notifications: `notifications/cancelled` gets a result, and a
notification the server doesn't handle, such as `notifications/progress`, gets a "method not found"
error.

Fix `WikiServer.handle` so that notifications are never answered:

- A message without an `id` is a notification. If `NOTIFICATIONS` has a handler for its method, run
  it (that's how the server records which requests were cancelled); either way, return `None`.
- Requests work exactly as before, including the -32601 error for unknown methods.

```python
server = WikiServer()
client = McpHarness(server.handle, protocol="2026-07-28")
client.discover()
client.notify("notifications/cancelled", {"requestId": 3})    # no reply, no error
server.cancelled                                            # [3]
```
