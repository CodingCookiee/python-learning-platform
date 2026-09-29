Harbour Bikes' sales team wants every inbound enquiry scored `hot`, `warm` or `cold`. Write two
functions:

`lead_messages(lead, examples)` is the prompt template. `examples` is a list of `(text, label)`
pairs. For each one, add a user message with the text wrapped as `<lead>\n{text}\n</lead>`, then an
assistant message whose content is the label. Finish with the new `lead`, wrapped the same way.

`classify_lead(llm, lead, examples)` sends those messages with `LEAD_SYSTEM` as the system prompt,
`max_tokens=5` and `temperature=0`, then checks the answer: strip whitespace, drop a trailing `.` or
`!`, and lower-case it. Return the label if it's one of `LABELS`, and `"unknown"` otherwise.

```python
examples = [
    ("We need 40 bikes for our delivery fleet by March. Budget approved.", "hot"),
    ("Just browsing prices for a team offsite next year.", "cold"),
]
classify_lead(llm, "Can you quote 12 cargo bikes for next month?", examples)   # model says "Hot." → "hot"

lead_messages("Can you quote 12 cargo bikes?", examples)
# [{"role": "user", "content": "<lead>\nWe need 40 bikes ...\n</lead>"},
#  {"role": "assistant", "content": "hot"},
#  {"role": "user", "content": "<lead>\nJust browsing ...\n</lead>"},
#  {"role": "assistant", "content": "cold"},
#  {"role": "user", "content": "<lead>\nCan you quote 12 cargo bikes?\n</lead>"}]
```
