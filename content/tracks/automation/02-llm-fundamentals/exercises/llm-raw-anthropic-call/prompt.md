Write `ask_claude(http, question, *, api_key, model)`, which sends `question` to Anthropic's
Messages API and returns the reply text.

- `http` is an `httpx.Client` whose `base_url` is already `https://api.anthropic.com`, so post to
  `/v1/messages`.
- Authenticate with the `x-api-key` header, and send `anthropic-version: 2023-06-01`.
- The body has the `model`, `max_tokens` of `500`, and one user message containing `question`.
- Raise an `httpx.HTTPStatusError` for an error response (`raise_for_status()` does it).

```python
http = httpx.Client(base_url="https://api.anthropic.com", timeout=60)
ask_claude(http, "Is order #1042 eligible for a refund after 40 days?",
           api_key=os.environ["ANTHROPIC_API_KEY"], model="claude-haiku-4-5")
# "Our policy allows refunds within 30 days, so order #1042 isn't eligible."
```

The tests give you a client connected to a fake of the API instead, which checks your headers and
records what you sent.
