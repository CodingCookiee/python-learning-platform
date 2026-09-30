The Leith physiotherapy clinic wants its booking dashboard and Claude to share one MCP server. Claude
reads text; the dashboard wants data it can render. Build the server so every tool returns both.

The starter defines `Tool(name, title, args, output, fn)`: `args` and `output` are Pydantic models,
and `fn` takes a validated `args` instance and returns an `output` instance (or a dict shaped like
one). Write `ToolServer(name, version, tools)` with a `handle(message)` method:

- **Notifications**: `None`. **Unknown methods**: `-32601`, `Method not found: <method>`.
- **`server/discover`**: `supportedVersions` `["2026-07-28"]`, `capabilities` `{"tools": {}}`, and
  `_meta` `{"io.modelcontextprotocol/serverInfo": {"name": name, "version": version}}`. (The
  version check from lesson 2 isn't needed here.)
- **`tools/list`**: one entry per tool, in order, with `name`, `title`, `description` (the `args`
  model's docstring, via `inspect.getdoc`), `inputSchema` and `outputSchema` (the two models' JSON
  schemas, each without its top-level `title` and `description`).
- **`tools/call`**:
  1. an unknown tool: `-32602`, `Unknown tool: <name>`;
  2. arguments that fail validation: an `isError` result with the text
     `Invalid arguments: <location>: <message>`, problems joined with `"; "`;
  3. a `ToolError` from `fn`: an `isError` result with its message;
  4. a return value that doesn't validate against `output` is a bug in the server: log it with
     `logger.error(...)` naming the tool, and return an `isError` result with the text
     `<name> returned invalid output`;
  5. otherwise `data = output.model_dump(mode="json")` of the checked value, and the result is
     `{"content": [<one text block with json.dumps(data)>], "structuredContent": data, "isError": False}`.

Every result has `"resultType": "complete"`, every `tools/call` result has an `isError` key, and
every error result has one text block. The tests build the
clinic's tools, `find_slots` and `next_appointment`, into a list called `TOOLS`:

```python
client = McpHarness(ToolServer("leith-physio", "3.0.0", TOOLS).handle, protocol="2026-07-28")
client.call_tool("find_slots", {"practitioner": "Patel", "day": "2026-10-01"})["structuredContent"]
# {"practitioner": "Patel", "day": "2026-10-01", "times": ["14:30", "16:00"]}
```
