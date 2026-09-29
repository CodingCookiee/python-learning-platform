Write the second adapter, `OpenAIClient(http, *, api_key, model)`, over OpenAI's Chat Completions
API. It has exactly the same interface as `AnthropicClient`, so any automation can take either. The
dataclasses and `to_openai_tool` are in the starter.

First, `to_openai_messages(messages, system=None)` translates the neutral messages:

- the system prompt, when given, becomes the first message: `{"role": "system", "content": system}`;
- an assistant message with `tool_calls` becomes OpenAI's shape, with each call's `arguments`
  encoded as a **JSON string** and `content` of `None` when there's no text;
- a `tool` message keeps its `tool_call_id` and `content`; anything else passes through as
  `{"role", "content"}`.

Then `complete(messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None)`
posts to `/v1/chat/completions` with `Authorization: Bearer <key>` and a body of `model`,
`max_completion_tokens` (from `max_tokens`) and the translated `messages`, plus `tools` (translated)
and `temperature` only when given. It raises `httpx.HTTPStatusError` for an error response and
otherwise returns an `LLMResponse`: the text (`""` for `null`), the tool calls with `arguments`
parsed, the stop reason mapped to `end_turn`, `max_tokens` or `tool_use`, the usage, and the model.
Its `repr()` shows the model, never the key.

```python
http = httpx.Client(base_url="https://api.openai.com", timeout=60)
gpt = OpenAIClient(http, api_key=os.environ["OPENAI_API_KEY"], model=os.environ["OPENAI_MODEL"])
gpt.complete([{"role": "user", "content": "Classify this lead: 'We need 40 seats by Friday.'"}],
             system="Reply hot, warm or cold.")
# LLMResponse(text="hot", tool_calls=[], stop_reason="end_turn",
#             usage=Usage(input_tokens=24, output_tokens=1), model=<your model>)
```
