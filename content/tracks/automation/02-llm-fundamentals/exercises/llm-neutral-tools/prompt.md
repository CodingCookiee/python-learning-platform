A neutral tool is a dict with a `name`, a `description` and `parameters`, a JSON schema for its
arguments. Write the two translations your adapters need:

- `to_anthropic_tool(tool)` returns `{"name", "description", "input_schema"}`, with the schema under
  `input_schema`.
- `to_openai_tool(tool)` returns `{"type": "function", "function": {"name", "description",
  "parameters"}}`.

A tool without a `description` gets `""`. Don't modify the dict you're given.

```python
lookup_order = {
    "name": "lookup_order",
    "description": "Find an order by its number.",
    "parameters": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]},
}
to_anthropic_tool(lookup_order)
# {"name": "lookup_order", "description": "Find an order by its number.", "input_schema": {...the schema...}}
to_openai_tool(lookup_order)
# {"type": "function", "function": {"name": "lookup_order", "description": "Find an order by its number.",
#                                   "parameters": {...the schema...}}}
```
