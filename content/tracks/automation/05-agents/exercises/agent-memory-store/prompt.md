Next week Priya writes again, and the support agent should know she prefers email and that
Harbour Dental renews in March. Write a `MemoryStore` that keeps facts across conversations:

```python
store = MemoryStore(embed)                 # embed(list_of_texts) -> list of vectors
store.remember(text, **meta)               # e.g. store.remember("Priya prefers email", customer="C-301")
store.recall(query, *, k=3, min_score=0.2, where=None) -> list[Memory]
len(store)                                 # how many memories it holds
```

- `remember` embeds the text **once**, when it's stored, with a single call to `embed`.
- `recall` embeds only the query (one call), scores each memory by cosine similarity, and returns
  up to `k` of them as `Memory(text, meta, score)`, highest score first, leaving out any below
  `min_score`.
- `where` is a dict such as `{"customer": "C-301"}`: only memories whose meta has all those values
  are considered.

```python
store.recall("When does Harbour Dental renew?")
# [Memory(text="Harbour Dental renews their contract in March", meta={"customer": "C-301"}, score=0.56...),
#  Memory(text="Tom Reed is the owner of Harbour Dental", meta={"customer": "C-301"}, score=0.31...)]
```
