Sales wants every inbound email scored `hot`, `warm` or `cold`. Don't ask the model for the score.
Ask it for facts, and apply sales' rules in code, where they can be tested and changed.

**`LeadFacts`**, a Pydantic model that forbids extra fields, and whose fields have no defaults (so
its schema is strict as it is):

| Field | Type | Meaning |
|-------|------|---------|
| `company` | str | the prospect's company |
| `seats` | int or None | how many people would use the product |
| `monthly_budget_usd` | int or None | the budget per month, in US dollars |
| `start_within_days` | int or None | how soon they want to start, in days |
| `wants_demo` | bool | they asked for a demo or a call |

**`qualify(facts)`** returns:

- `"hot"` when they want a demo, **and** have at least 20 seats, **and** want to start within 90
  days. Every one of those must be known: a `None` never counts.
- `"warm"` when it isn't hot but they want a demo, or have at least 5 seats, or have a budget of at
  least 500 a month.
- `"cold"` otherwise.

**`qualify_lead(llm, email)`** sends the email between `<email>` and `</email>` tags (each on its
own line) with `schema=LeadFacts.model_json_schema()` and `temperature=0`, validates the reply,
and returns `(facts, score)`.

```python
llm = ScriptedLLM(['{"company": "Northwind", "seats": 40, "monthly_budget_usd": null, '
                   '"start_within_days": 60, "wants_demo": true}'])
facts, score = qualify_lead(llm, "We're Northwind, 40 people, want to switch in two months. Demo?")
facts.seats   # 40
score         # "hot"
```
