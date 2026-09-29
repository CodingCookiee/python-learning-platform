Write `evaluate_retrieval(questions, search, k=5)` for Harbour Physio's eval set. Each question is
a dict with `"id"`, `"question"` and `"relevant"` (a list of the chunk ids that answer it, empty
for a question the documents don't cover). `search(question, k)` returns a list of chunk ids, best
first.

- Only answerable questions (a non-empty `"relevant"`) are scored. Call `search` once for each of
  them, with the question text and `k`, and use only the first `k` ids it returns. Don't search
  for the unanswerable ones.
- A question's recall is the fraction of its relevant chunks (counting each id once) found in its
  results. Its reciprocal rank is `1 / rank` of the first relevant result, counting from 1, or `0`
  if there's none.
- Return a dict with `f"recall@{k}"` and `"mrr"`, each the average over the answerable questions,
  rounded to 3 decimal places, and `"misses"`: the ids of the questions with no relevant chunk in
  their results, in question order.
- With no answerable questions there's nothing to measure: raise `ValueError`.

```python
evaluate_retrieval(QUESTIONS, search, k=3)
# {"recall@3": 0.667, "mrr": 0.333, "misses": ["q3"]}
```

(`QUESTIONS` and `search` are the three questions and results from the predict drill, with one
unanswerable question added.)
