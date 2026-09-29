You keep a bank of discovery questions, and before each call you pick the ones that fit this client
and cover what you don't know yet. Write
`pick_questions(bank, *, industry, covered=(), limit=8)`, which returns the texts of the questions
to ask, in order.

Each question in the bank is a dict:

```python
{"text": "Walk me through yesterday. What did you do first?", "topic": "process",
 "must": True, "industries": []}
```

`must` defaults to `False` and `industries` to `[]` (an empty list means the question suits every
industry). The rules:

1. Only questions that apply to `industry` are considered (compared case-insensitively).
2. Every `must` question comes first, in bank order. They're always included, even beyond `limit`.
3. Then the other questions, in bank order, until there are `limit` in total. Skip any question
   whose topic is in `covered` (what the last call already answered) or already has a question in
   the list: one question per topic is plenty.

```python
pick_questions(BANK, industry="dental", covered={"volume"}, limit=5)   # BANK is in the tests
# ["Walk me through yesterday. What did you do first?",
#  "Who else is involved in deciding on this?",
#  "Where do patients fall through the cracks between booking and their visit?",
#  "When did this last go wrong, and what did it cost?",
#  "Have you set a budget for this, even a rough range?"]
```
