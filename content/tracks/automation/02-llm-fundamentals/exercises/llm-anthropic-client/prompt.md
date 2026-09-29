Finish `AnthropicClient`, the adapter from the lesson, so it supports the whole neutral interface.
The dataclasses and the message and tool translations are in the starter.

`AnthropicClient(http, *, api_key, model)` keeps an injected `httpx.Client` (with `base_url` set to
`https://api.anthropic.com`), the key and a default model. Its `repr()` shows the model and never
the key.

`complete(messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None)`
posts to `/v1/messages` with the `x-api-key` and `anthropic-version` headers, and a body of:

- `model` (the argument, or the default), `max_tokens`, and the messages translated with
  `to_anthropic_messages`;
- `system`, `tools` (each translated with `to_anthropic_tool`) and `temperature`, **only when
  they're given**.

It raises `httpx.HTTPStatusError` for an error response, and otherwise returns an `LLMResponse`: the
text blocks joined, a `ToolCall` for each `tool_use` block, the stop reason (`stop_sequence` becomes
`end_turn`), the usage, and the model the API reports.

```python
http = httpx.Client(base_url="https://api.anthropic.com", timeout=60)
claude = AnthropicClient(http, api_key=os.environ["ANTHROPIC_API_KEY"], model="claude-haiku-4-5")
claude.complete([{"role": "user", "content": "Summarise: order #1042 arrived cracked."}],
                system="One sentence.", max_tokens=100)
# LLMResponse(text="Order #1042 arrived with a cracked screen.", tool_calls=[], stop_reason="end_turn",
#             usage=Usage(input_tokens=17, output_tokens=11), model="claude-haiku-4-5")
```
