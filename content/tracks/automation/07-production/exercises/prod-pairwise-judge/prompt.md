You're choosing between two versions of the support bot's prompt, and you want a judge to say which
version's answers are better. Judges prefer whichever answer they read first, so ask twice.

Write `compare(llm, question, answer_a, answer_b)`, which returns a `Preference(winner, consistent)`
(in the starter):

1. Call the judge with `system=PAIRWISE_SYSTEM` and `temperature=0`, and one user message holding
   the question and both answers, each in its own block:
   `<question>…</question>`, `<answer_1>…</answer_1>`, `<answer_2>…</answer_2>`. The first call has
   `answer_a` as answer 1; the second call swaps them, with `answer_b` as answer 1.
2. Each reply is JSON like `{"reason": "...", "winner": "1"}`, where the winner is `"1"`, `"2"` or
   `"tie"`. Map each back to `"a"`, `"b"` or `"tie"`.
3. If the two agree, that's the winner and `consistent` is `True`. If they don't, the winner is
   `"tie"` and `consistent` is `False`.

Then write `head_to_head(llm, cases)`, which compares every case (dicts with `"question"`, `"a"`
and `"b"`) and returns counts: `{"a": …, "b": …, "tie": …, "inconsistent": …}`, where
`inconsistent` counts the cases whose two verdicts disagreed (they're also counted as ties).

```python
llm = ScriptedLLM(['{"reason": "Mentions the 14 days.", "winner": "2"}',
                   '{"reason": "Mentions the 14 days.", "winner": "1"}'])
compare(llm, "How long do refunds take?", "Soon!", "Within 14 days.")
# Preference(winner='b', consistent=True)
```
