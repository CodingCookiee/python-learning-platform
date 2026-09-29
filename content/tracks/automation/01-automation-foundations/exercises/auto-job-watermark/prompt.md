An agency's job copies new leads from a form tool into its CRM every 15 minutes. The first
version asked for "leads from the last 15 minutes", and lost every lead that arrived while the
server was rebooting. Rewrite its selection step with a **watermark**.

Write `select_batch(leads, watermark, now, limit=100)`. Each lead is a dict with an `"id"` and a
timezone-aware `"created"` datetime. `watermark` is the `created` time of the last lead a
previous run processed, or `None` on the very first run.

Return a tuple `(batch, new_watermark)`:

- `batch` holds the leads created after `watermark` and no later than `now`, oldest first, at most
  `limit` of them (the oldest ones);
- `new_watermark` is the `created` time of the last lead in `batch`, or the old `watermark` if the
  batch is empty.

```python
batch, mark = select_batch(leads, watermark=nine_am, now=ten_am)
[lead["id"] for lead in batch], mark
# (["L-102", "L-103"], <created time of L-103>)
```

Leads created after `now` are left for a later run: the form tool's clock and yours may disagree
by a few seconds, and `now` is the edge of what this run is sure about.
