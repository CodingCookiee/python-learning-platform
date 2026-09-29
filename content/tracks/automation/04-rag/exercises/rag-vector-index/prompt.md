Build the index behind Harbour Physio's policy Q&A: `VectorIndex(embed)`, where `embed` takes a
list of texts and returns a list of vectors (in the tests, `fake_embed`, wrapped to record its
calls). Don't assume the vectors are normalised.

- **`add(chunks)`** stores chunks: dicts with at least `"id"` and `"text"`, plus any metadata.
  It embeds all their texts in **one** call to `embed`. An empty list does nothing (and doesn't
  call `embed`). A chunk whose id is already in the index, or appears twice in the list, raises
  `ValueError` and nothing is added.
- **`search(query, k=3)`** embeds the query (one call) and returns up to `k` results, most similar
  first, ties in the order the chunks were added. Each result is a new dict: the chunk's keys plus
  `"score"`, its cosine similarity as a plain `float`. The stored chunks never get a `"score"`
  key. Searching an empty index returns `[]` without calling `embed`.
- **`len(index)`** is the number of chunks stored.

```python
index = VectorIndex(fake_embed)
index.add([
    {"id": "fees#0", "source": "fees.md", "text": "A first assessment costs 65 pounds. Follow-up sessions cost 50 pounds."},
    {"id": "cancellations#0", "source": "cancellations.md", "text": "Cancel at least 24 hours before your appointment to avoid a fee."},
    {"id": "cancellations#1", "source": "cancellations.md", "text": "Late cancellations and missed appointments are charged the full session fee."},
])
[(r["id"], round(r["score"], 3)) for r in index.search("What is the fee for a missed appointment?", k=2)]
# [("cancellations#0", 0.615), ("cancellations#1", 0.53)]
```
