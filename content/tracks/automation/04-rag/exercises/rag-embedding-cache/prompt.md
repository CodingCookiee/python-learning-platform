Harbour Physio's ingestion runs every night, re-chunks every policy, and until now paid to embed
all 1,800 chunks each time. Write `CachedEmbedder(embed, model, store=None, batch_size=100)`, a
drop-in `embed` function that only sends texts it hasn't seen before.

- Calling it with a list of texts returns a list of vectors, one per text, in the same order,
  like `embed` itself.
- Vectors are cached in `store`, a dict (a new empty one when `store` is `None`), under a key built
  from **both** the model name and the exact text, so a shared store never mixes two models'
  vectors.
- Only texts that aren't in the store are sent to `embed`, each **once** even if it appears several
  times, in the order they first appear, in calls of at most `batch_size` texts.
- A call where everything is cached doesn't call `embed` at all.
- If `embed` returns a different number of vectors than it was sent, raise `ValueError` and store
  nothing from that batch.
- `len(cached)` is the number of vectors in the store.

```python
cached = CachedEmbedder(fake_embed, model="fake-64")
cached(["Cancel 24 hours ahead.", "Parking is free."])                    # embeds 2 texts
cached(["Parking is free.", "Fees are listed below.", "Parking is free."])  # embeds only "Fees are listed below."
len(cached)                                                               # 3
```
