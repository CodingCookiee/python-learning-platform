Northwind's support agent trims its history before each call: the task (the first message) plus
the last `keep_last` messages. Most of the time it works. Then, a few times a day, a long
conversation fails with a 400 from the provider: `tool_result block(s) provided when previous
message does not have tool_use blocks`.

The trim can cut between an assistant message that makes tool calls and the tool results that
answer them, so the kept part starts with a result whose call is gone. Fix `trim_history` so it
never does: if the kept part would start with a tool result, move the cut later, past every
orphaned result. It may then keep fewer than `keep_last` messages.

It still always keeps the first message, returns a copy of a history that's short enough, and
never changes the list it's given.

```python
[m["role"] for m in trim_history(HISTORY, keep_last=6)]   # HISTORY has 11 messages
# before: ["user", "tool", "assistant", "user", "assistant", "tool", "assistant"]   <- 400
# after:  ["user", "assistant", "user", "assistant", "tool", "assistant"]
```
