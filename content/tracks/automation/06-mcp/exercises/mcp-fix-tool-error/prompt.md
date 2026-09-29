When a customer gives Claude a mistyped order number, Claude Desktop shows "Tool get_order failed:
MCP error -32603" and the model has nothing to go on. The server reports every tool failure as a
JSON-RPC error, so the host treats the server as broken instead of letting the model read what went
wrong. It also sends the raw exception text, which for the carrier API includes an internal
address.

Fix `call_tool` so that a tool that runs and fails returns a **result** with `"isError": true` and
one text block:

| The tool call raises | Text |
|----------------------|------|
| a `ToolError` (including `OrderNotFound`) | the exception's message, e.g. `Order 9999 not found` |
| a `TypeError` (arguments the function can't take) | `Invalid arguments for <name>` |
| anything else | `<name> failed`, and log it with `logger.exception(...)`, mentioning the tool |

An unknown tool is still a protocol error, `-32602`, and successful calls don't change.

```python
client = McpHarness(handle)
client.initialize()
client.call_tool("get_order", {"order_id": "9999"})
# {"content": [{"type": "text", "text": "Order 9999 not found"}], "isError": True}
```
