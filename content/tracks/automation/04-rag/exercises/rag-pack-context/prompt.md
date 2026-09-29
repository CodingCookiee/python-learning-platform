Brightwell's handbook bot retrieves up to 20 chunks, but the answer prompt has a budget of 800
tokens for sources, and the index is full of near-duplicates (the same policy pasted into three
pages). Write `pack_context(ranked, embed, max_tokens=800, duplicate_threshold=0.95)`, which
chooses the chunks to send and orders them.

- `ranked` is a list of chunk dicts (with `"id"` and `"text"`), best first. Call `embed` once, with
  all their texts in order (and not at all when `ranked` is empty). Don't assume unit vectors.
- Go through the chunks in rank order. **Skip** a chunk whose cosine similarity with a chunk you've
  already chosen is at least `duplicate_threshold`. **Skip** a chunk whose `estimate_tokens(text)`
  (in the starter) is more than the budget that's left, and carry on: a later, shorter chunk may
  still fit. Otherwise choose it and take its tokens off the budget.
- Return the chosen chunks in **lost-in-the-middle order**: best first, second best last, third
  second, and so on.

```python
[c["id"] for c in pack_context(RANKED, fake_embed, max_tokens=50)]
# ["leave#0", "leave#3", "leave#2"]
```

Here `RANKED` holds, best first: `leave#0` (18 tokens), `leave#0-copy` (the same words, so a
duplicate), `leave#2` (16), `appendix` (123, too big), `leave#3` (14) and `pto#0` (11, which no
longer fits).
