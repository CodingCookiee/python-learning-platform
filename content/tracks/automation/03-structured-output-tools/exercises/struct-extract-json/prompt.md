Write `extract_json(text)` that returns the first JSON **object** (a `dict`) in a model's reply,
however it's wrapped:

- with a sentence before it or a note after it,
- inside a markdown code fence,
- with braces inside its string values (`"note": "uses {curly} braces"`),
- after a stray `{` in the prose that doesn't start valid JSON.

If the reply contains no JSON object, raise `ValueError` with the message
`No JSON object found in the reply`.

````python
reply = """Sure! Here is the lead:
```json
{"company": "Northwind", "seats": 40, "contact": {"name": "Ada Park"}}
```
Let me know if you need anything else."""

extract_json(reply)   # {"company": "Northwind", "seats": 40, "contact": {"name": "Ada Park"}}
````

Don't slice from the first `{` to the last `}`: that breaks on the note-with-braces case. Use a real
JSON parser that can stop where the object ends.
