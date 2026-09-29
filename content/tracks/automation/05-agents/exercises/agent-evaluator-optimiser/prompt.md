The sales assistant writes cold emails, and a separate judge model scores them. Write the loop:

```python
optimise(writer, judge, brief, *, threshold=8, max_rounds=3) -> Best
```

`writer` and `judge` are two LLMs with the usual interface. The helpers and system prompts are in
the starter; every call is a single user message.

1. The writer drafts with `write_prompt(brief)` and `system=WRITER_SYSTEM`.
2. Each round (at most `max_rounds`), the judge scores the latest draft: `judge_prompt(brief,
   draft)`, `system=JUDGE_SYSTEM`, `temperature=0`. It replies with JSON `{"score": 0-10,
   "feedback": "..."}`. A reply that isn't valid JSON, or has no integer `score`, counts as score 0
   with empty feedback.
3. A score of at least `threshold` returns `Best(draft, score, round)` straight away.
4. Otherwise, unless it's the last round, the writer improves the draft with
   `improve_prompt(brief, draft, feedback)` and `system=WRITER_SYSTEM`.
5. If no draft reaches the threshold, return the **best-scoring** draft seen (the earlier one on a
   tie) as `Best(text, score, max_rounds)`. Revisions can make a draft worse.

```python
writer = ScriptedLLM([DRAFT_A, DRAFT_B])
judge = ScriptedLLM(['{"score": 5, "feedback": "Too vague; give a concrete result."}',
                     '{"score": 9, "feedback": "Specific and short."}'])
optimise(writer, judge, BRIEF)   # Best(text=DRAFT_B, score=9, rounds=2)
```
