Brightwell's handbook bot answered "20 days of annual leave" for a month after the policy changed
to 25, because nobody re-indexed. Write `sync_index(index, documents, hashes, chunker=split_paragraphs)`,
which the nightly job runs to bring the index up to date, paying to embed only what changed.

- `documents` maps each source (`"leave.md"`) to its current text.
- `hashes` maps each source already in the index to the SHA-256 hex digest of the text it was
  indexed from. It's the job's saved state: update it in place.
- `index` is the starter's `Index`: `upsert(chunks)` embeds and stores chunks, and
  `delete_source(source)` removes every chunk from one source. `chunker(text, source)` returns a
  document's chunks.

For each source, compare the SHA-256 of its text (`hashlib.sha256(text.encode()).hexdigest()`)
with `hashes`:

- **added** (not in `hashes`) and **updated** (a different hash): its chunks are (re)indexed. An
  updated document's old chunks are deleted first, so none are left behind when it gets shorter.
- **unchanged**: nothing happens.
- **removed** (in `hashes` but not in `documents`): its chunks are deleted and it leaves `hashes`.

All the chunks of added and updated documents go into **one** `upsert` call, in sorted source
order; with nothing to add, don't call `upsert` at all. Return a dict with the keys `"added"`,
`"updated"`, `"removed"` and `"unchanged"`, each a sorted list of sources.

```python
index, hashes = Index(fake_embed), {}
sync_index(index, {"leave.md": "Annual leave: 20 days.", "expenses.md": "Receipts within 30 days."}, hashes)
# {"added": ["expenses.md", "leave.md"], "updated": [], "removed": [], "unchanged": []}
sync_index(index, {"leave.md": "Annual leave: 25 days."}, hashes)
# {"added": [], "updated": ["leave.md"], "removed": ["expenses.md"], "unchanged": []}
```
