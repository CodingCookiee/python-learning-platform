`summarise_ticket(http, ticket, *, api_key, model)` sends a support ticket to Anthropic and returns a
one-line summary for the on-call engineer. It was ported from an OpenAI version, and the real API
rejects every request with a 400:

```text
invalid_request_error: messages: Unexpected role "system". The Messages API accepts a top-level
`system` parameter, not "system" as an input message role.
```

Fix the request so the instructions in `SYSTEM` go where Anthropic expects them. The conversation
must contain only the ticket, as a single user message. Keep everything else the same.

```python
summarise_ticket(http, "Order #1042 arrived with a cracked screen, customer wants a replacement.",
                 api_key=os.environ["ANTHROPIC_API_KEY"], model="claude-haiku-4-5")
# "Cracked screen on order #1042; customer wants a replacement."
```
