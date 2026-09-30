The Leith physiotherapy clinic's appointment server has to work with whichever client the front desk
uses this year, and in the current protocol every request says which version it speaks. Write the
server's `handle(message)`. The starter defines the constants, and `META` is the
`"io.modelcontextprotocol/"` prefix of the `_meta` keys.

- **Notifications** (no `id`): return `None`, whatever the method.
- **Every request** is checked first, using `params["_meta"]`:
  - if `META + "protocolVersion"` isn't a string or `META + "clientCapabilities"` isn't a dict (or
    there's no `_meta` at all): error `-32602`, message
    `Invalid params: _meta needs protocolVersion and clientCapabilities`;
  - if the version isn't in `SUPPORTED_VERSIONS`: error `-32022`, message
    `Unsupported protocol version`, with
    `"data": {"supported": SUPPORTED_VERSIONS, "requested": <the version>}`.
- **`server/discover`**: `supportedVersions`, `capabilities` and `instructions` from the constants.
- **`tools/list`**: `{"tools": TOOLS}`.
- **Any other request**: error `-32601`, message `Method not found: <method>`.

Every result has `"resultType": "complete"` and `"_meta": {META + "serverInfo": SERVER_INFO}`, and
every response has `"jsonrpc": "2.0"` and the request's `id`.

```python
client = McpHarness(handle, protocol="2026-07-28")
client.discover()["supportedVersions"]           # ["2026-07-28"]
McpHarness(handle, protocol="2027-03-01").request("tools/list")["error"]["data"]
# {"supported": ["2026-07-28"], "requested": "2027-03-01"}
```
