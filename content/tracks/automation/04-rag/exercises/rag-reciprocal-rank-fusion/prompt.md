Ledgerline's search now has two rankings for every question: one from vector search and one from
BM25. Write `rrf(rankings, k=60)`, which fuses any number of rankings with reciprocal rank fusion.

- `rankings` is a list of rankings, each a list of document ids, best first.
- In each ranking, a document at rank `r` (counting from 1) gets `1 / (k + r)`. Its fused score is
  the sum over the rankings it appears in.
- If a ranking lists the same id twice, only its first (best) position counts.
- Return a list of `(id, score)` pairs, highest score first. Equal scores keep the order in which
  the ids first appear, reading the rankings in order.

```python
vector = ["xero-export", "csv-export", "e-4012"]
keyword = ["e-4012", "e-2001", "xero-export"]
[(doc_id, round(score, 4)) for doc_id, score in rrf([vector, keyword])]
# [("xero-export", 0.0323), ("e-4012", 0.0323), ("csv-export", 0.0161), ("e-2001", 0.0161)]
```
