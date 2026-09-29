`parse_openai_message(message)` turns the assistant message from an OpenAI response into the neutral
`(text, tool_calls)`, where each tool call is a `ToolCall(id, name, arguments)` and `arguments` is a
dict. The support bot then runs the tool with `lookup_order(**call.arguments)`, and that line
crashes the first time the model calls a tool:

```text
TypeError: lookup_order() argument after ** must be a mapping, not str
```

Fix `parse_openai_message` so `arguments` is always a dict. A message with only tool calls has
`content` of `None`, and its text must be `""`.

```python
message = {
    "role": "assistant",
    "content": None,
    "tool_calls": [{"id": "call_7", "type": "function",
                    "function": {"name": "lookup_order", "arguments": "{\"order_id\": \"1042\"}"}}],
}
parse_openai_message(message)
# ("", [ToolCall(id="call_7", name="lookup_order", arguments={"order_id": "1042"})])
```
