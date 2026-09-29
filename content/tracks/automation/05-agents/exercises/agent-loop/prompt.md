Write the loop for the on-call helper:

```python
run_agent(llm, task, tools, registry, *, system=None, max_steps=8) -> AgentResult
```

- The conversation starts as one user message with the `task`. Every model call passes that
  conversation, the `system` prompt, and the `tools` **plus** the `FINISH` tool from the starter.
- If the response calls `finish`, stop: `AgentResult(answer, "finished", steps, trace)` with the
  answer from its `answer` argument. Don't run any other calls in that response.
- If the response has no tool calls, stop: `AgentResult(response.text, "no_finish", steps, trace)`.
- Otherwise append the assistant message, then run each call in order and append its result
  (`assistant_message` and `tool_result` are in the starter). The result's content is the tool's
  output as JSON; for a tool that isn't in `registry` it's `{"error": "Unknown tool: <name>"}`, and
  for a tool that raises it's `{"error": str(error)}`, also as JSON. Nothing crashes the loop.
- Record every call that ran in the trace as `Step(step, name, arguments, ok)`, where `step` is the
  number of the model call that asked for it (from 1) and `ok` is false for an error.
- After `max_steps` model calls without a stop, return `AgentResult(None, "step_limit", max_steps, trace)`.
- `steps` is always the number of model calls made.

```python
llm = ScriptedLLM([
    tool_call("get_error_rate", service="checkout-api"),
    tool_call("get_recent_deploys", service="checkout-api"),
    tool_call("finish", answer="Errors began 4 minutes after deploy d-4417. Roll it back."),
])
result = run_agent(llm, "Alert: checkout-api 5xx rate is 7%.", TOOLS, REGISTRY, system=SYSTEM)
result.stop_reason, result.steps, [s.tool for s in result.trace]
# ("finished", 3, ["get_error_rate", "get_recent_deploys"])
```
