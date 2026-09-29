Write two generators that stream a reply and yield its text as it arrives, one piece (a **delta**)
at a time. Both take an `httpx.Client` whose `base_url` is set for the provider, the neutral
`messages`, and keyword arguments `api_key`, `model`, `system=None` and `max_tokens=1024`. The
`parse_sse` parser from the last drill is in the starter.

`stream_anthropic(...)` posts to `/v1/messages` with the usual headers and a body of `model`,
`max_tokens`, `messages`, `"stream": True` and `system` when it's given. It yields the `text` of
every `text_delta` in a `content_block_delta` event, and ignores every other event.

`stream_openai(...)` posts to `/v1/chat/completions` with the bearer token and a body of `model`,
`max_completion_tokens`, the messages (with the system prompt first, when given) and
`"stream": True`. It yields each chunk's `choices[0].delta.content` when there is some, skips chunks
with no choices, and stops at `[DONE]`.

Both use `http.stream()` so text is yielded while the response is still arriving, send nothing until
they're first iterated, and raise `httpx.HTTPStatusError` for an error response.

```python
deltas = stream_anthropic(http, [{"role": "user", "content": "Draft a reply: order #1042 is two days late."}],
                          api_key=os.environ["ANTHROPIC_API_KEY"], model="claude-haiku-4-5")
for delta in deltas:
    print(delta, end="", flush=True)
# Sorry, your order #1042 is running two days late ...   (appearing a few words at a time)
```
