Your support bot sends the whole chat history on every turn, and long chats have started failing
with "prompt is too long". Write `fit_history(messages, *, system, context_window, max_tokens)`,
which returns the most recent part of the conversation that fits:

- The system prompt, the kept messages **and** `max_tokens` for the reply must fit in
  `context_window`. Count tokens with the `estimate_tokens` function in the starter, once for the
  system prompt (which may be `None`) and once per message `content`.
- Keep the newest messages. Drop from the oldest end, and never skip a message in the middle: stop
  at the first (from newest) that doesn't fit.
- The result must start with a `user` message, as both APIs expect, so drop any `assistant`
  messages left at the front.
- If not even the newest message fits, raise `ValueError` with a message containing
  `doesn't fit`.
- Return a new list and leave `messages` unchanged.

```python
chat = [
    {"role": "user", "content": "My order #1042 hasn't arrived."},          # 8 tokens
    {"role": "assistant", "content": "Sorry! It left our warehouse Monday."},  # 9 tokens
    {"role": "user", "content": "Can you check the tracking?"},             # 7 tokens
]
fit_history(chat, system="You help Harbour Bikes customers.", context_window=40, max_tokens=16)
# budget: 40 - 16 - 9 (system) = 15 tokens, so only the last message fits:
# [{"role": "user", "content": "Can you check the tracking?"}]
```
