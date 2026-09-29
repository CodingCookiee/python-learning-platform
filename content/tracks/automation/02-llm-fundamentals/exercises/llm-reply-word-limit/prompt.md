Harbour Bikes' support replies go out by SMS, so they must be short. Write
`draft_support_reply(llm, ticket, *, policy, max_words=60)`:

1. Ask `llm` for a reply. The system prompt is `REPLY_TEMPLATE` (in the starter) filled in with
   `policy` and `max_words`. The only message is a user message with the ticket as
   `<ticket>\n{ticket}\n</ticket>`. Use `max_tokens=300` and `temperature=0.3`.
2. Count the words in the reply (split on whitespace). If it's within `max_words`, return it with
   surrounding whitespace removed.
3. Otherwise ask **once** more with the same settings, continuing the conversation: the original
   message, then the first reply as an assistant message, then a user message saying exactly
   `That reply is {n} words. Rewrite it in at most {max_words} words, keeping the same facts.`
4. Return the second reply (stripped) if it fits. If it's still too long, raise `ValueError` with a
   message that includes its word count.

```python
reply = draft_support_reply(llm, "My order #1042 is late. When will it come?",
                            policy="Orders ship within 2 working days.", max_words=12)
# first reply: 20 words, too long, so a second request is sent:
#   [user: <ticket>..., assistant: <the 20-word reply>,
#    user: "That reply is 20 words. Rewrite it in at most 12 words, keeping the same facts."]
reply   # "Sorry for the wait! Order #1042 ships within 2 working days."
```
