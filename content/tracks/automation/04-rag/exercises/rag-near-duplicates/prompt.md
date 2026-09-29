Three people have edited Harbour Physio's FAQ over the years, and it now says most things twice
in slightly different words. Before indexing it, the clinic wants a list of likely duplicates to
review. Write `near_duplicates(texts, embed, threshold=0.9)`.

- Call `embed` once, with all the texts. Don't assume the vectors are normalised.
- Return every pair `(i, j, score)` with `i < j` whose cosine similarity is at least `threshold`,
  where `score` is a `float` rounded to 3 decimal places (compare the rounded score with the
  threshold).
- Sort the pairs by score, highest first, then by `i`, then by `j`.
- Fewer than two texts have no pairs: return `[]`.

```python
texts = [
    "How do I cancel an appointment? Call reception at least 24 hours before.",
    "Opening hours: we are open 8am to 8pm on weekdays.",
    "To cancel an appointment, call reception at least 24 hours before.",
    "Is there parking at the clinic? Free parking is behind the building.",
    "We are open 8am to 8pm on weekdays, and 9am to 1pm on Saturdays.",
    "Parking: there is free parking behind the clinic building.",
]
near_duplicates(texts, fake_embed, threshold=0.85)
# [(3, 5, 1.0), (0, 2, 0.901)]
```

Try doing it without a Python loop over pairs: a list of 2,000 entries has almost two million.
