Trimming alone makes the support agent forget what the customer already tried. Write
`compact(llm, messages, *, keep_last=6, max_tokens=3000)`, which summarises the part it drops:

- If `history_tokens(messages)` is at most `max_tokens`, return a copy of the messages. No model call.
- Otherwise split the history at `safe_start(messages, keep_last)` (in the starter: it never starts
  on an orphaned tool result). The **older** part is everything after the task and before that
  point, the **recent** part is from that point on.
- Summarise the older part with **one** model call: a single user message of `SUMMARY_PROMPT`, a
  blank line, then `transcript(older)` between `<transcript>` and `</transcript>` lines, with
  `max_tokens=400`.
- Return a new history: one user message with the task's content, a blank line,
  `Summary of the conversation so far:`, a new line and the summary (stripped), followed by the
  recent messages unchanged.

```python
compact(llm, HISTORY, keep_last=4, max_tokens=500)
# [{"role": "user", "content": "Why does my CSV export fail? Account C-301.\n\nSummary of the conversation so far:\nAccount C-301 (growth plan)..."},
#  ...the last 4 messages...]
```
