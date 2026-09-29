A physiotherapy clinic's appointment server has to work with whichever client the front desk uses
this year. Write its `handle(message)` for the handshake and `ping`. The starter defines the
constants.

- **Notifications** (no `id`): return `None`, whatever the method.
- **`initialize`**: the result is

  ```python
  {"protocolVersion": <negotiated>, "capabilities": CAPABILITIES,
   "serverInfo": SERVER_INFO, "instructions": INSTRUCTIONS}
  ```

  where the negotiated version is the client's `params["protocolVersion"]` if it's in
  `SUPPORTED_VERSIONS` (newest first), and otherwise the server's newest version. If the params
  have no `protocolVersion`, or it isn't a string, answer with error `-32602` and the message
  `Invalid params: protocolVersion is required`.
- **`ping`**: the result is `{}`.
- **Any other request**: error `-32601` with the message `Method not found: <method>`.

Every response has `"jsonrpc": "2.0"` and the request's `id`.

```python
client = McpHarness(handle)
client.initialize("2025-06-18")["protocolVersion"]    # "2025-06-18"
client.initialize("2024-11-05")["protocolVersion"]    # "2025-11-25"
client.request("ping")["result"]                      # {}
```
