Harbour Physio's policy search works, but it takes seconds per question now the corpus has grown
to 20,000 chunks: it recomputes every chunk's length on every search, in pure Python.

Rewrite `PolicySearch` with numpy so it answers **30 questions over 20,000 chunks within the time
limit**, with exactly the same interface and results:

- `PolicySearch(vectors, ids)` takes a list of vectors (lists of floats, not normalised) and their
  chunk ids.
- `search(query, k=5)` returns up to `k` pairs `(id, score)`, best first, where `score` is the
  cosine similarity rounded to 6 decimal places as a `float`. Equal scores keep their original
  order, and a zero vector (chunk or query) scores `0.0`.

```python
search = PolicySearch([[3.0, 4.0], [1.0, 0.0], [0.0, 2.0]], ["fees#0", "cancellations#0", "parking#0"])
search.search([1.0, 1.0], k=2)    # [("fees#0", 0.989949), ("cancellations#0", 0.707107)]
```
