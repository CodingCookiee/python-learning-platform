Harbour Physio runs two clinics, and a question from a patient at the Leith clinic must only be
answered from policies that apply there. The starter's `VectorIndex` works (it's the one you
built). Add a `where` filter to `search(query, k=3, where=None)`:

- `where` is a dict of metadata conditions, and a chunk must meet **all** of them. A condition's
  value is either one value (the chunk's field must equal it) or a list, tuple or set of values
  (the chunk's field must be one of them). A chunk without the field doesn't match.
- Filter **before** ranking: when at least `k` chunks match, `k` results come back, however poorly
  the matching chunks score against the rest of the index.
- If no chunk matches, return `[]` without calling `embed`.
- `where=None` (or `{}`) searches everything, as before.

```python
index.search("How much does an assessment cost?", k=3, where={"source": ["fees.md", "insurance.md"]})
# [fees#0 (0.414), insurance#0 (0.101), fees#1 (-0.123)]
```
