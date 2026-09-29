Write `summarise_lead(llm, email)` for the lead-capture automation. `llm` is your A2 client (the
tests pass a scripted fake with the same `complete()` method). It should:

1. Send **one** request with a system prompt that asks for only a JSON object with the fields
   `company`, `seats`, `deadline` and `wants_demo`, and says to use `null` when the email doesn't
   give a value.
2. Put the email in the single user message, between `<email>` and `</email>` tags, each on its
   own line.
3. Use `temperature=0`.
4. If the reply stopped because of `max_tokens`, raise `ValueError` with a message containing
   `cut off`, instead of parsing it.
5. Otherwise return the JSON object from the reply as a dict, even if the model wrapped it in
   prose or a code fence. The starter includes a working `extract_json` for that.

```python
llm = ScriptedLLM(['Here it is: {"company": "Northwind", "seats": 40, "deadline": "before March", "wants_demo": true}'])
summarise_lead(llm, "Hi, we're Northwind, about 40 people...")
# {"company": "Northwind", "seats": 40, "deadline": "before March", "wants_demo": True}

llm.calls[0]["messages"]
# [{"role": "user", "content": "<email>\nHi, we're Northwind, about 40 people...\n</email>"}]
```
