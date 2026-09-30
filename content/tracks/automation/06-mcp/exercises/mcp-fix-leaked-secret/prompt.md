A support lead asked Claude "is the product sync working?" and the transcript, now in the
support team's shared history, contains the shop's admin API token twice: once from `shop_info`,
which returns the whole configuration, and once from a `sync_status` error message, because the
token was in the URL of the request that timed out.

Fix the server so the token (read from the `KILN_SHOP_TOKEN` environment variable) never leaves it:

- `shop_info` returns the settings **without** the `token` key.
- `sync_status` sends the token as a header, `{"Authorization": "Bearer <token>"}`, passed to
  `fetch(url, headers=...)`, and the URL no longer contains it:
  `https://kiln-and-co.shop.example/admin/api/sync`.
- As a last line of defence, `call_tool` passes every text it returns, results and errors alike,
  through `redact` with the current token.

Tool errors are still `isError` results with the error's message, and nothing else changes.

```python
client = McpHarness(handle, protocol="2026-07-28")
client.call_tool("shop_info")["content"][0]["text"]
# '{"shop": "kiln-and-co", "api_url": "https://kiln-and-co.shop.example/admin/api", "currency": "GBP"}'
```
