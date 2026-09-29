`judge(llm, case, answer)` grades one support-bot answer against a golden case, and returns `True`
when it passes the rubric. To calibrate it, a colleague labelled 60 answers by hand and added
`"human_label"` and `"labeller_notes"` to each case. The judge then agreed with her on all 60,
which is what made you suspicious: it can read her label in its prompt, and it's copying it.

Fix `judge` so the judge sees only what it should:

- The system prompt is `JUDGE_SYSTEM`, unchanged, and the call keeps `temperature=0`.
- The one user message contains the case's `question`, its `reference` and the `answer` being
  graded, each in its own tagged block: `<question>…</question>`, `<reference>…</reference>` and
  `<answer>…</answer>`.
- Nothing else from the case reaches the model: no id, no human label, no labeller's notes.
- It still returns the verdict's `"passes"` value.

```python
case = {"id": "refund-window", "question": "How long do refunds take?",
        "reference": "Refunds reach the card within 14 days.", "human_label": "fail",
        "labeller_notes": "Promises a free label, which we don't offer."}
judge(llm, case, "Within 14 days, and we'll send a free return label!")
# False, from the judge's reply {"reason": "...", "passes": false}
# and llm.calls[0]["messages"][0]["content"] has no "fail", no notes and no id in it
```
