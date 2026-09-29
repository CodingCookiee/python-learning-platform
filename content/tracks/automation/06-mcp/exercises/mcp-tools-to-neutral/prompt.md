Your A5 agent takes neutral tool definitions, `{"name", "description", "parameters"}`. An MCP server
lists its tools as `{"name", "description", "inputSchema", ...}`. Write the translation:

```python
neutral_tools(mcp_tools: list[dict], prefix: str | None = None) -> list[dict]
```

- `parameters` is the tool's `inputSchema` (a copy, not the same dict).
- `description` is the tool's description, or `""` if it has none. Everything else (`title`,
  `annotations`, `outputSchema`) is dropped.
- With a `prefix`, each name becomes `<prefix>__<name>` (two underscores), so tools from several
  servers can't collide.

```python
tools = [{"name": "get_order", "title": "Get order", "description": "Look up an order.",
          "inputSchema": {"type": "object", "properties": {"order_id": {"type": "string"}}},
          "annotations": {"readOnlyHint": True}}]
neutral_tools(tools, prefix="orders")
# [{"name": "orders__get_order", "description": "Look up an order.",
#   "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}}}]
```
