Brightline Bookkeeping runs each payment reminder through a critique loop before it's sent: write,
critique, revise, for up to three rounds. The logs show the critic giving the same feedback every
round, the revisions never getting better, and most reminders ending unapproved after six calls.

The bug is in which draft each call sees. Fix `refine(llm, brief, *, max_rounds=3)` so every
critique reviews the **latest** draft and every revision starts from it. It returns
`Refined(text, rounds, approved)`: the final draft, the number of critique rounds used, and whether
the critic approved it. Keep the prompts, the round limit and the return values as they are.

```python
llm = ScriptedLLM([DRAFT_1, "Too aggressive: don't threaten.", DRAFT_2, "Mention the amount.", DRAFT_3, "APPROVED"])
refine(llm, BRIEF)   # Refined(text=DRAFT_3, rounds=3, approved=True)
# and the critique calls saw DRAFT_1, DRAFT_2 and DRAFT_3, in that order
```
