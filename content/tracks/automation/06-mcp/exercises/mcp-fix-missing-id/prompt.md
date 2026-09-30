The operations manager added Kiln & Co's new order server to Claude Desktop, and it sits on
"connecting" until it times out. The server's log shows the `server/discover` request arriving and
a reply going out, so the server thinks it's fine.

Find the bug in `handle` and fix it, so that every response can be matched to its request. Error
responses already work; don't change what any reply contains apart from that.

```python
client = McpHarness(handle, protocol="2026-07-28")
client.discover()["_meta"]["io.modelcontextprotocol/serverInfo"]   # {"name": "kiln-orders", "version": "1.0.0"}
client.request("tools/list")["result"]                             # {"resultType": "complete", "tools": []}
```
