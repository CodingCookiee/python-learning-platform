Write `parse_sse(lines)`, a generator that turns lines of a server-sent event stream (strings without
their newlines, as `response.iter_lines()` gives them) into `(event, data)` pairs:

- A line `event: <name>` sets the event's name. Without one, the name is `None`.
- A line `data: <text>` adds a line of data. Several `data` lines are joined with `"\n"`.
- Split a line at its **first** colon, and drop one space after the colon if there is one.
- A line starting with `:` is a comment: skip it. Ignore any other field, such as `id:` or `retry:`.
- A blank line ends the event: yield it if it has any data, then start a new one (name back to
  `None`). If the stream ends without a final blank line, yield the last event if it has data.
- Yield each event as soon as its blank line arrives, without reading further ahead.

```python
lines = [
    "event: content_block_delta",
    'data: {"delta": {"text": "Order #1042 "}}',
    "",
    ": keep-alive",
    "",
    'data: {"choices": []}',
    "",
    "data: [DONE]",
]
list(parse_sse(lines))
# [("content_block_delta", '{"delta": {"text": "Order #1042 "}}'),
#  (None, '{"choices": []}'),
#  (None, "[DONE]")]
```
