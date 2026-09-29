The staff wiki's MCP server works in the MCP Inspector, but a stricter client disconnects straight
after the handshake with "received a response to an unknown request". The server answers
everything, including notifications: `notifications/initialized` gets a result, and
`notifications/cancelled`, which the server doesn't handle, gets a "method not found" error.

Fix `WikiServer.handle` so that notifications are never answered:

- A message without an `id` is a notification. If `NOTIFICATIONS` has a handler for its method, run
  it (that's how the server knows the client is ready); either way, return `None`.
- Requests work exactly as before, including the -32601 error for unknown methods.

```python
server = WikiServer()
client = McpHarness(server.handle)
client.initialize()          # no longer fails on the initialized notification
server.ready                 # True
client.notify("notifications/cancelled", {"requestId": 3})   # no reply, no error
```
