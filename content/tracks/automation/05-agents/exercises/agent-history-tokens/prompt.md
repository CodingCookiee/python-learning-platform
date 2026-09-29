Before trimming anything, the support agent needs to know how big its history is. Write
`history_tokens(messages, *, system=None)`, using `estimate_tokens` from the starter (about four
characters per token):

- the system prompt, if there is one;
- each message's `content` (a missing or `None` content counts as empty);
- for an assistant message with tool calls, `estimate_tokens(json.dumps(message["tool_calls"]))`
  as well.

```python
history_tokens([{"role": "user", "content": "Our CSV export has failed since Monday."}])   # 10
```
