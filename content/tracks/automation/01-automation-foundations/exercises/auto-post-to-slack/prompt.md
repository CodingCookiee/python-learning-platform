Write `post_lead_alert(client, token, channel, lead)`, which posts a new lead to Slack and returns
the message's `ts`.

- `client` is an `httpx.Client` whose `base_url` is `https://slack.com/api`.
- Send `POST /chat.postMessage` with the header `Authorization: Bearer <token>` and the JSON body
  `{"channel": channel, "text": text}`.
- `text` is `New lead: <name> (<company>) <email>`, or `New lead: <name> <email>` when the lead
  has no company (the key is missing, `None` or empty). Escape the name and company with
  `slack_escape` (provided) because they come from a form.
- Slack answers most errors with HTTP 200 and `{"ok": false, "error": "<code>"}`. Raise
  `SlackError` (provided) with the error code as its message. For HTTP errors (a `429`, a `500`),
  raise httpx's `HTTPStatusError`.

```python
lead = {"name": "Amira Haddad", "company": "Haddad Physio", "email": "amira@example.com"}
post_lead_alert(client, "test-token", "#leads", lead)
# "1773072000.000100"
# the body sent: {"channel": "#leads", "text": "New lead: Amira Haddad (Haddad Physio) amira@example.com"}
```
