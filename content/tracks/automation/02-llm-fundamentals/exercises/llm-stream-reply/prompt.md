A Slack bot shows Claude's reply as it's written, by editing its message every few words, and then
logs the token counts for billing. Write
`stream_reply(http, messages, *, api_key, model, on_delta, system=None, max_tokens=1024)`, which
streams a reply from Anthropic and returns the same `LLMResponse` a normal call would.

- Send the streaming request (as in the last drill: `"stream": True`, `system` only when given).
- Call `on_delta(text)` for each `text_delta`, **as it arrives**.
- Build the response from the events:

  | Event | Gives you |
  |-------|-----------|
  | `message_start` | `message.model` and `message.usage.input_tokens` |
  | `content_block_delta` with a `text_delta` | a piece of the text |
  | `message_delta` | `delta.stop_reason` and `usage.output_tokens` |
  | `message_stop` | the end: stop reading |

  `tool_calls` is `[]`, and a `stop_sequence` stop reason becomes `end_turn`.
- An `error` event raises `RuntimeError` with the error's message in it. Deltas that arrived before
  it have already been passed to `on_delta`.
- An error status raises `httpx.HTTPStatusError`.

```python
shown = []
reply = stream_reply(http, [{"role": "user", "content": "Is order #1042 on its way?"}],
                     api_key=os.environ["ANTHROPIC_API_KEY"], model="claude-haiku-4-5", on_delta=shown.append)
shown   # ["Yes! Order #", "1042 left ou", "r warehouse ", "this morning", "."]
reply   # LLMResponse(text="Yes! Order #1042 left our warehouse this morning.", tool_calls=[],
        #             stop_reason="end_turn", usage=Usage(input_tokens=7, output_tokens=13),
        #             model="claude-haiku-4-5")
```
