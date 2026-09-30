The clinic's appointment server speaks the current protocol (it's the server from the discovery
drill, in the starter). But the front desk's laptop runs a client built for `2025-06-18`, which opens
with the `initialize` handshake and never sends `_meta`, and the server turns it away. Make
`AppointmentServer` **dual-era**: modern requests stay exactly as they are, and older clients get the
handshake. Each connection gets its own `AppointmentServer()`.

- **`initialize`** (never version-checked, since older clients send no `_meta`): negotiate
  `params["protocolVersion"]` against `LEGACY_VERSIONS`, the client's version if it's there and the
  newest otherwise, store it in `self.legacy_version`, and answer through `result(...)` with
  `protocolVersion`, `capabilities` (`CAPABILITIES`), `serverInfo` (`SERVER_INFO`) and `instructions`.
  A missing or non-string version is `-32602`, `Invalid params: protocolVersion is required`.
- **After `initialize`**, requests without `_meta` are served on this connection as before
  (`tools/list`, and -32601 for unknown methods).
- **Before `initialize`**, a request without `_meta` is still the -32602 malformed-request error.
- A request **with** `_meta` is always checked and served the modern way, even after an
  `initialize`.

Notifications, `notifications/initialized` included, still get `None`.

```python
old = McpHarness(AppointmentServer().handle)         # an older client: protocol 2025-06-18
old.initialize()["protocolVersion"]                   # "2025-06-18"
[tool["name"] for tool in old.list_tools()]           # ["find_slots"]
McpHarness(AppointmentServer().handle, protocol="2026-07-28").discover()["supportedVersions"]   # ["2026-07-28"]
```
