A CRM sync uploads customer records in batches, and the progress bar in the admin panel is fed by a
stream of events. Write two generator functions:

`upload_batch(batch, upload)` uploads each record in `batch` (a list of dicts with an `"id"`) by
calling `upload(record)`, which returns `True` on success and `False` on failure. It yields
`("uploaded", id)` or `("failed", id)` for each record, and **returns** the number uploaded.

`upload_all(batches, upload)` runs every batch through `upload_batch`, delegating with
`yield from`, and yields:

- `("batch", number, size)` before each batch, numbering from 1,
- every event from `upload_batch`,
- `("batch_done", number, uploaded)` after each batch, using `upload_batch`'s return value,
- finally `("summary", uploaded, total)`: records uploaded and records attempted, over all
  batches.

Events are produced as the caller asks for them, so each record is uploaded only when its event is
about to be yielded.

```python
batches = [[{"id": "C1"}, {"id": "C2"}], [{"id": "C3"}]]
list(upload_all(batches, lambda record: record["id"] != "C2"))
# [("batch", 1, 2), ("uploaded", "C1"), ("failed", "C2"), ("batch_done", 1, 1),
#  ("batch", 2, 1), ("uploaded", "C3"), ("batch_done", 2, 1), ("summary", 2, 3)]
```
