The clinic's booking assistant works in unit tests that only check the final answer, and fails
against both real providers on the second request:

```text
Anthropic: 400 invalid_request_error: messages.1.content.0: unexpected `tool_use_id` found in
`tool_result` blocks. Each `tool_result` block must have a corresponding `tool_use` block in the
previous message.
OpenAI: 400 invalid_request_error: Invalid parameter: messages with role 'tool' must be a response
to a preceding message with 'tool_calls'.
```

Find the bug in `run_tools` and fix it, so that each request's history reads: the user's question,
then for every turn that used tools, the assistant message with **all** of that turn's tool calls
followed by one tool result per call.

```python
llm = ScriptedLLM([tool_call("find_slots", practitioner="Patel", day="2026-10-01"),
                   "Dr Patel is free at 14:30 and 16:00."])
run_tools(llm, [{"role": "user", "content": "Is Dr Patel free on Thursday?"}], TOOLS, REGISTRY)
[m["role"] for m in llm.calls[1]["messages"]]   # ["user", "assistant", "tool"]
```
