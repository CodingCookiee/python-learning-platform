A shop's order-status assistant crashes whenever a customer mistypes their order number:
`lookup_order` raises `OrderNotFound`, the exception escapes `run_tools`, and the customer gets a
generic error page instead of "I can't find order 9999, could you check the number?".

Fix `run_tools` so that a failing tool never crashes the loop. Instead, the failure goes back to
the model as that call's tool result, with the content `json.dumps({"error": message})`:

- an exception raised by a tool: the message is `str(error)`, for example `No order 9999`;
- a tool name that isn't in the registry: the message is `Unknown tool: <name>`, and nothing runs;
- arguments the function can't take (a `TypeError` when calling it): handled like any exception.

Also log each failure with `logger.warning(...)` (the starter defines `logger`), mentioning the tool's
name, so someone can spot a tool that fails a lot. Successful calls work exactly as before.

```python
llm = ScriptedLLM([tool_call("lookup_order", order_id="9999"),
                   "I can't find order 9999. Could you check the number on your confirmation email?"])
run_tools(llm, QUESTION, TOOLS, REGISTRY)   # returns the model's answer, no exception
llm.calls[1]["messages"][-1]["content"]     # '{"error": "No order 9999"}'
```
