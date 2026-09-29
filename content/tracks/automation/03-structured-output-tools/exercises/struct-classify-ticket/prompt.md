Write the classifier for the support inbox.

**`TicketLabel`**, a Pydantic model that forbids extra fields, with:

- `category`: one of `"billing"`, `"shipping"`, `"returns"`, `"technical"` or `"unknown"`,
- `confidence`: a float from 0 to 1,
- `reason`: a string, one sentence saying why.

**`classify_ticket(llm, ticket)`** sends one request and returns a `TicketLabel`:

- The system prompt lists every label in `LABELS` (in the starter) on its own line, as
  `- label: definition`.
- The ticket goes in the single user message between `<ticket>` and `</ticket>` tags, each on its
  own line.
- It asks for structured output with `schema=TicketLabel.model_json_schema()` and uses
  `temperature=0`.
- A classifier must never stop the pipeline: if the reply isn't a valid `TicketLabel` (a label that
  isn't on the list, a confidence of 1.3, not JSON at all), return a `TicketLabel` with category
  `"unknown"` and confidence `0.0` instead of raising.

```python
llm = ScriptedLLM(['{"category": "shipping", "confidence": 0.92, "reason": "The parcel has not arrived."}'])
label = classify_ticket(llm, "My parcel from order 1042 never arrived.")
label.category     # "shipping"
label.confidence   # 0.92
```
