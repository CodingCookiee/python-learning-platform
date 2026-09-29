Kiln & Co's full order server has write tools (`cancel_order`, `refund_order`) that the warehouse
app needs. The deployment for Claude Desktop must be read-only, and must not let a looping agent
hammer the order API. Rather than fork the server, wrap its handler:

```python
guard(handle, *, allowed_tools: set[str], calls_per_minute: int, clock=time.monotonic) -> handle
```

The returned function passes messages to `handle`, except:

1. **`tools/list`**: the reply lists only the tools whose names are in `allowed_tools`, in their
   original order. Everything else in the reply stays as it was.
2. **`tools/call` for a tool not in `allowed_tools`**: reply `-32602`, `Unknown tool: <name>`,
   exactly as if the tool didn't exist, **without calling `handle`**.
3. **Rate limit** on allowed `tools/call` requests: count the calls let through in the last 60
   seconds (a call made at time `t` counts until `t + 60`, not at `t + 60`). If there are already
   `calls_per_minute`, don't call `handle`; reply with a result
   `{"content": [{"type": "text", "text": "Rate limit reached: try again in <n> s"}], "isError": True}`,
   where `n` is the seconds until the oldest counted call expires, rounded up. Refused calls don't
   count.

Notifications and every other method pass straight through.

```python
now = [0.0]
client = McpHarness(guard(handle, allowed_tools={"get_order", "search_docs"}, calls_per_minute=2,
                          clock=lambda: now[0]))
client.initialize()
[tool["name"] for tool in client.list_tools()]      # ["get_order", "search_docs"]
client.call_tool("get_order", {"order_id": "1042"})  # runs
now[0] = 20.0; client.call_tool("get_order", {"order_id": "1043"})  # runs
now[0] = 45.5; client.call_tool("get_order", {"order_id": "1044"})["content"][0]["text"]
# "Rate limit reached: try again in 15 s"
```
