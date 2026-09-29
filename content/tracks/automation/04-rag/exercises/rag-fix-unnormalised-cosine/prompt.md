Brightwell's handbook bot moved to a self-hosted embedding model, and since then it keeps
answering with the 4,000-word "Appendix: all policies" page. The model returns vectors that
**aren't unit length**, and the search code was written for a provider whose vectors were.

Fix `similarity_scores(query, docs)` so it returns the **cosine similarity** of the query to each
document vector, as a numpy array of floats, one per document. `rank(query, docs)`, which sorts
document indices best first, is already right and uses it.

- The scores must not depend on the vectors' lengths, only their directions.
- A document vector (or query) of all zeros scores `0.0`, never `nan`.

```python
query = [1.0, 1.0, 0.0]
docs = [[1.0, 1.0, 0.0],    # the short, on-topic answer
        [3.0, 2.0, 6.0]]    # the long appendix
similarity_scores(query, docs)   # array([1.  , 0.505...])
rank(query, docs)                # [0, 1]  (the starter says [1, 0])
```
