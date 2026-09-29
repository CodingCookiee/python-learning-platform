Build the loop the support assistant will run on: every tool's arguments are validated by a
Pydantic model before the tool runs, and a response can hold several tool calls at once.

The starter defines `Tool(name, description, args, fn)`: `args` is the Pydantic model for the
arguments, `fn` takes a validated instance of it, and `tool.definition()` gives the neutral tool
definition. Write:

```python
run_agent(llm, question, tools, *, system, max_steps=6) -> Run
```

1. The conversation starts with one user message, `question`. Every call to the model sends the
   conversation, `system`, and the definitions of all `tools`.
2. When a response has no tool calls, return `Run(answer=response.text, steps=..., executed=...)`,
   where `steps` is the number of model calls made and `executed` lists the names of the tools
   that actually ran, in the order they ran.
3. Otherwise append the assistant message once, then one tool result **per call, in the order the
   calls were made**, each with its own `tool_call_id`. For each call:
   - an unknown tool name: the result is `{"error": "Unknown tool: <name>"}`;
   - arguments that fail validation: `{"error": "Invalid arguments for <name>: <problems>"}`, with
     the problems from `validation_feedback`, and **the tool doesn't run**;
   - a tool that raises: `{"error": str(error)}`;
   - otherwise, the tool's return value.

   Every result's content is JSON (`json.dumps(..., default=str)`).
4. After `max_steps` model calls without a final answer, raise `StepLimitExceeded`.

```python
llm = ScriptedLLM([
    [tool_call("get_order", order_id="1042"), tool_call("get_order", order_id="1043")],
    "Order 1042 has shipped and 1043 is being packed.",
])
run = run_agent(llm, "Where are my orders 1042 and 1043?", TOOLS, system=SYSTEM)
run.answer      # "Order 1042 has shipped and 1043 is being packed."
run.steps       # 2
run.executed    # ["get_order", "get_order"]
[m["role"] for m in llm.calls[1]["messages"]]   # ["user", "assistant", "tool", "tool"]
```
