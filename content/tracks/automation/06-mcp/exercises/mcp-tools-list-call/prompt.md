Kiln & Co's order server has two read-only tools. Each one is a Pydantic model for its arguments
(its docstring is written for the model) and a function that takes a validated instance, registered
in `TOOLS`. The starter's `handle` does the JSON-RPC part. Write the two functions it calls:

**`list_tools() -> dict`** returns `{"tools": [...]}`, one entry per tool in `TOOLS` order:

```python
{"name": "get_order",
 "description": <the model's docstring, via inspect.getdoc>,
 "inputSchema": <model_json_schema(), without its "title" and "description">,
 "annotations": {"readOnlyHint": True}}
```

**`call_tool(params) -> dict`** returns a `tools/call` result (use the starter's `text_result`):

1. A name that isn't in `TOOLS`: raise `UnknownTool(name)` (`handle` turns it into -32602).
2. Validate `params["arguments"]` (missing means `{}`) with the tool's model. If that fails, return
   an `isError` result with the text `Invalid arguments: ` followed by one `location: message`
   per problem, joined with `"; "`. The function must not run.
3. Call the function with the validated model. A `LookupError` it raises is an `isError` result
   with `str(error)` as the text.
4. Otherwise return its value as JSON text, with `isError` false.

```python
client = McpHarness(handle)
client.initialize()
[tool["name"] for tool in client.list_tools()]          # ["get_order", "find_orders"]
client.call_tool("get_order", {"order_id": "10423"})["content"][0]["text"]
# "Invalid arguments: order_id: String should match pattern '^\\d{4}$'"
```
