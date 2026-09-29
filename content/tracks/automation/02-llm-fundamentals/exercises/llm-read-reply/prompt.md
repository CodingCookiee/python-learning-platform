Your automation shouldn't care which provider answered. Write `read_reply(provider, payload)`, which
takes `"anthropic"` or `"openai"` and the parsed JSON of a successful response, and returns one dict
in the same shape for both:

| Key | Anthropic | OpenAI |
|-----|-----------|--------|
| `"text"` | the `text` of every `text` block in `content`, joined with no separator | `choices[0].message.content`, or `""` when it's `null` |
| `"stop_reason"` | `stop_reason`, with `stop_sequence` mapped to `"end_turn"` | `finish_reason`: `stop` → `"end_turn"`, `length` → `"max_tokens"`, `tool_calls` → `"tool_use"` |
| `"input_tokens"` | `usage.input_tokens` | `usage.prompt_tokens` |
| `"output_tokens"` | `usage.output_tokens` | `usage.completion_tokens` |

Any other stop reason passes through unchanged. An unknown provider raises `ValueError`.

```python
read_reply("openai", {
    "choices": [{"message": {"role": "assistant", "content": "Lead looks hot."}, "finish_reason": "stop"}],
    "usage": {"prompt_tokens": 42, "completion_tokens": 5, "total_tokens": 47},
    "model": "gpt-fake",
})
# {"text": "Lead looks hot.", "stop_reason": "end_turn", "input_tokens": 42, "output_tokens": 5}
```
