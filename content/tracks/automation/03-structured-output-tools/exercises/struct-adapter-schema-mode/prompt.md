Add structured output to your A2 adapters. Write the two provider-specific pieces as plain
functions, so each adapter can call them:

**`schema_options(provider, schema)`** returns the fields to merge into the request body when
`complete()` is called with `schema=`:

- `"anthropic"`: `output_config.format` of type `json_schema`, holding the schema.
- `"openai"`: `response_format` of type `json_schema`, whose `json_schema` has a `name` (the
  schema's `title`, or `"output"` if it has none), `"strict": True`, and the schema.
- Any other provider: `ValueError`.

**`structured_text(provider, body)`** takes the provider's parsed JSON response and returns the
JSON text the model produced:

- Anthropic: the text of the response's `text` content blocks, joined. If `stop_reason` is
  `"refusal"`, raise `Refused` (defined in the starter).
- OpenAI: the first choice's message `content`. If the message has a `refusal`, raise `Refused`
  with the refusal text as its message.

```python
schema = {"title": "Ticket", "type": "object", "properties": {"category": {"type": "string"}},
          "required": ["category"], "additionalProperties": False}

schema_options("openai", schema)
# {"response_format": {"type": "json_schema",
#                      "json_schema": {"name": "Ticket", "strict": True, "schema": schema}}}

structured_text("anthropic", {"content": [{"type": "text", "text": '{"category": "shipping"}'}],
                              "stop_reason": "end_turn"})
# '{"category": "shipping"}'
```
