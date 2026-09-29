Write `summarise_ticket(llm, ticket)`, which asks `llm` (any object with the course's `complete()`
method) for a one-line summary of a support ticket and returns it.

- The instructions are `SUMMARY_SYSTEM`, from the starter, sent as the system prompt.
- The ticket is the only message: a user message whose content is the ticket between `<ticket>` tags,
  each tag on its own line.
- Use `temperature=0` and `max_tokens=100`.
- Return the reply's text with surrounding whitespace removed.

```python
summarise_ticket(llm, "Order #1042 arrived with a cracked screen. I'd like a replacement.")
# "Cracked screen on order #1042; customer wants a replacement."

# and the request the model received:
# system:   SUMMARY_SYSTEM
# messages: [{"role": "user", "content": "<ticket>\nOrder #1042 arrived with ...\n</ticket>"}]
```

The tests pass a `ScriptedLLM`, which replies from a script and records every call in `.calls`.
