Northwind's support inbox mixes billing, technical and sales questions. Write
`route_ticket(llm, ticket) -> Routed`, a router in two calls:

1. **Classify.** One call with `system=ROUTER_SYSTEM`, `temperature=0`, `max_tokens=5` and a
   single user message: the ticket between `<ticket>` and `</ticket>` lines. Normalise the reply:
   strip whitespace, lower-case it, and drop a trailing full stop.
2. **Handle.** If the label is a key of `HANDLERS`, make one call with that handler's system
   prompt and the ticket (as it is) as the user message, and return `Routed(label, reply)`.

Any other label returns `Routed("human", None)`, with no second call.

```python
llm = ScriptedLLM(["Billing", "Sorry about the double charge on INV-2291. I've flagged it for a refund review."])
route_ticket(llm, "I was charged twice for September!")
# Routed(route="billing", reply="Sorry about the double charge on INV-2291. I've flagged it for a refund review.")
```
