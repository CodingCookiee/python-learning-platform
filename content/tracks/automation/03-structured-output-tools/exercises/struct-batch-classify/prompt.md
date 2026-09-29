The inbox gets 400 tickets a day. Classify them `batch_size` at a time instead of one per call.

Write `classify_batch(llm, tickets, *, batch_size=20)`. `tickets` is a dict of ticket id to text,
and the result is a dict of **every** ticket id to its category, in the same order as `tickets`.

For each batch of up to `batch_size` tickets, in order:

1. Send one request with `system=BATCH_SYSTEM` (in the starter) and `temperature=0`, whose single
   user message is the batch as a JSON array of `{"id": ..., "text": ...}` objects between
   `<tickets>` and `</tickets>` tags, each tag on its own line:

   ```text
   <tickets>
   [{"id": "T-101", "text": "Where is my parcel?"}, {"id": "T-102", "text": "Card declined twice"}]
   </tickets>
   ```

2. The model replies with an object like `{"results": [{"id": "T-101", "category": "shipping"}, ...]}`,
   possibly with prose or a fence around it (`extract_json` is in the starter).
3. Be strict about what comes back:
   - validate each result on its own with `Labelled` (in the starter), so one bad item costs one
     ticket, not the batch;
   - a ticket with no valid result is `"unknown"`;
   - ignore results for ids that weren't in this batch;
   - a reply with no JSON in it makes the whole batch `"unknown"`, and the next batch still runs.

```python
tickets = {"T-101": "Where is my parcel?", "T-102": "Card declined twice", "T-103": "App crashes on login"}
llm = ScriptedLLM([
    '{"results": [{"id": "T-101", "category": "shipping"}, {"id": "T-102", "category": "billing"}]}',
    '{"results": [{"id": "T-103", "category": "technical"}]}',
])
classify_batch(llm, tickets, batch_size=2)
# {"T-101": "shipping", "T-102": "billing", "T-103": "technical"}
len(llm.calls)   # 2
```
