Write the loop that drives the clinic's booking assistant:

```python
run_tools(llm, messages, tools, registry, *, system=None, max_steps=5) -> str
```

- `messages` is the conversation so far, `tools` the neutral tool definitions to offer, and
  `registry` a dict from tool name to the Python function that implements it.
- Each step calls `llm.complete` with the conversation, the `system` prompt and the `tools`.
- When the response has no tool calls, return its text.
- Otherwise append the assistant message, then run each tool call with its arguments and append
  one result per call, in order, and go round again. `assistant_message` and `tool_result` are in
  the starter.
- Make at most `max_steps` calls to the model. If it's still asking for tools after that, raise
  `StepLimitExceeded`.
- Never change the caller's `messages` list.

```python
llm = ScriptedLLM([
    tool_call("find_slots", practitioner="Patel", day="2026-10-01"),
    tool_call("book_appointment", practitioner="Patel", start="2026-10-01T14:30", patient_email="ada@example.com"),
    "You're booked with Dr Patel on Thursday at 14:30. Your reference is BK-5521.",
])
run_tools(llm, [{"role": "user", "content": "Book me the first Thursday slot with Dr Patel. ada@example.com"}],
          TOOLS, REGISTRY, system=SYSTEM)
# "You're booked with Dr Patel on Thursday at 14:30. Your reference is BK-5521."
```
