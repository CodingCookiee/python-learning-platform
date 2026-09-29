"Improve the reporting process" can't be accepted, because nobody can say when it's done. Write
`lint_deliverables(deliverables)`, which checks a list of deliverable descriptions and returns
`(index, problem)` pairs, in list order. For each deliverable, report, in this order:

1. `"vague word: <word>"` for each word that starts with one of `VAGUE_STEMS` (so "improve",
   "improved" and "improvements" all count), lower-cased, in the order they appear, each distinct
   word once.
2. `"open-ended: <phrase>"` for each phrase in `OPEN_ENDED` that appears as whole words, ignoring
   case, in `OPEN_ENDED` order.
3. `"no number"` if the text has no digit at all. A deliverable you can accept almost always has a
   number in it: a count, a time, a threshold.

```python
lint_deliverables([
    "Improve the reporting process",
    "A daily sales report emailed to 3 managers by 08:00",
    "Chatbot answers FAQs, bookings, etc.",
])
# [(0, "vague word: improve"), (0, "no number"), (2, "open-ended: etc"), (2, "no number")]
```
