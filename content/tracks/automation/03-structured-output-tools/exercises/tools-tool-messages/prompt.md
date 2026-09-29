The tool loop adds two kinds of message to the conversation. Write the helpers that build them in
the neutral format.

**`assistant_message(response)`** turns an `LLMResponse` into the assistant message that goes into
the history: `{"role": "assistant", "content": response.text}`, plus a `"tool_calls"` list of
`{"id", "name", "arguments"}` dicts when the response has any tool calls. (The response holds
`ToolCall` objects; the history holds plain dicts.)

**`tool_result(call, output)`** builds the message that answers one tool call:
`{"role": "tool", "tool_call_id": call.id, "content": ...}`. The content is `output` itself when it's
a string, and otherwise `output` as JSON, with anything JSON can't represent (a `date`, a `Decimal`)
turned into a string.

```python
response = LLMResponse(text="", tool_calls=[ToolCall("call_01", "find_slots", {"practitioner": "Patel"})],
                       stop_reason="tool_use")
assistant_message(response)
# {"role": "assistant", "content": "",
#  "tool_calls": [{"id": "call_01", "name": "find_slots", "arguments": {"practitioner": "Patel"}}]}

tool_result(response.tool_calls[0], ["14:30", "16:00"])
# {"role": "tool", "tool_call_id": "call_01", "content": '["14:30", "16:00"]'}
```
