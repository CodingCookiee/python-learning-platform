Put Ledgerline's two searches together. Write `hybrid_search(query, chunks, embed, k=3,
candidates=10)`, which returns the ids of the best `k` chunks. `chunks` is a list of dicts with
`"id"` and `"text"`; the starter has a working `BM25` class and `rrf` function.

1. **Vector ranking:** call `embed` **once**, with the query first and then every chunk's text,
   and rank the chunks by cosine similarity to the query (don't assume unit vectors). Keep the top
   `candidates` ids, equal scores in chunk order.
2. **Keyword ranking:** rank the chunks with `BM25` over their texts, keeping the top `candidates`
   ids that score above 0.
3. **Fuse** the two rankings with `rrf`, the vector ranking first, and return the first `k` ids.

With no chunks, return `[]` without calling `embed`.

With `ARTICLES` holding the six help articles from the BM25 drill as chunks (ids `"xero-export"`,
`"e-4012"`, `"csv-export"`, `"e-2001"`, `"reminders"` and `"prefix"`):

```python
hybrid_search("card payment failed", ARTICLES, fake_embed, k=3)
# ["e-2001", "reminders", "e-4012"]
```

"reminders" is only fifth by vector similarity, but BM25 ranks it second (it mentions payment),
and being found by both searches lifts it above "e-4012".
