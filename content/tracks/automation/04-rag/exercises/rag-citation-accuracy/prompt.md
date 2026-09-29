Each run of Ledgerline's answer eval produces one case per question:

```python
case = {
    "answerable": True,                       # does the documentation answer it?
    "relevant": ["invoices.md#1"],            # the chunks labelled as answering it
    "given": ["invoices.md#1", "tax.md#2"],   # the chunks the model was shown
    "cited": ["tax.md#2", "pricing.md#0"],    # the chunks its answer cites
    "refused": False,                         # did the bot refuse?
}
```

Write `grade_answer(case)`, which returns a list of problems (strings), in this order:

1. An answerable question that was refused has one problem, `"refused an answerable question"`,
   and nothing else is checked.
2. An unanswerable question that wasn't refused has `"answered a question the documents don't cover"`.
3. For an answer (not refused), each cited id that isn't in `given`, in citation order:
   `"cited pricing.md#0, which it wasn't given"`.
4. For an answer to an answerable question, if no cited id is in `relevant`:
   `"none of its citations are relevant"`.

A refused unanswerable question, and a correct answer, have no problems: `[]`.

Also write `pass_rate(cases)`, the fraction of cases with no problems, rounded to 3 decimal places
(`ValueError` for no cases).

```python
grade_answer(case)
# ["cited pricing.md#0, which it wasn't given", "none of its citations are relevant"]
```
