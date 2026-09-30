Kiln & Co's support agent should use the order server and the wiki server over MCP instead of its
own copies of their tools. Connect your agent loop to them.

**`McpToolbox(prefix, client)`** wraps one connected MCP client (in the tests, a
`McpHarness(handle, protocol="2026-07-28")`; locally, the SDK's `Client` behind the same two calls):

- `definitions()`: the server's tools as neutral tools, named `<prefix>__<tool name>`, with the
  `description` (or `""`) and the `inputSchema` as `parameters`.
- `owns(name)`: whether a neutral tool name belongs to this server (it starts with `<prefix>__`).
- `call(name, arguments) -> str`: strip the prefix, send `tools/call` with
  `client.request("tools/call", {"name": ..., "arguments": ...})`, and return the text for the tool
  message: `result_to_text(result)` (from the starter) for a result, or
  `json.dumps({"error": <the error's message>})` for a protocol error.

**`run_agent(llm, question, toolboxes, *, max_steps=6) -> str`** is the A3 loop over those tools:

1. List every toolbox's definitions **once**, before the first model call, and send them all with
   every call, as `tools=`. The conversation starts with one user message, `question`.
2. When a response has no tool calls, return its text.
3. Otherwise append the assistant message (the starter's `assistant_message`), then one tool
   message per call, in order, `{"role": "tool", "tool_call_id": call.id, "content": ...}`. Route
   each call to the toolbox that owns it; a name no toolbox owns gets
   `json.dumps({"error": "Unknown tool: <name>"})`.
4. After `max_steps` model calls without an answer, raise `StepLimitExceeded`.

```python
llm = ScriptedLLM([tool_call("orders__get_order", order_id="1042"),
                   "Order 1042 shipped with DPD."])
run_agent(llm, "Where is order 1042?", [McpToolbox("orders", orders), McpToolbox("wiki", wiki)])
# "Order 1042 shipped with DPD."
llm.calls[1]["messages"][-1]["content"]   # '{"order_id": "1042", "status": "shipped", "carrier": "DPD"}'
```
