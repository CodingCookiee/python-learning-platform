Harbour Physio's policies are long paragraphs of prose with no headings. Write
`sentence_chunks(text, max_chars=300, overlap=1)`, which packs whole sentences into chunks.

- A sentence ends at `.`, `!` or `?` followed by whitespace. A chunk is its sentences joined by
  single spaces.
- Add sentences to the current chunk while it stays within `max_chars`. When the next one doesn't
  fit, start a new chunk.
- A new chunk begins with the last `overlap` sentences of the previous chunk, followed by the new
  sentence. If that's too long, drop carried sentences from the front until it fits (possibly all
  of them).
- A single sentence longer than `max_chars` is a chunk on its own: sentences are never cut.
- Empty or blank text gives `[]`.

```python
policy = ("Cancel at least 24 hours before your appointment. Late cancellations are charged in full. "
          "We waive the fee for illness. Call reception to cancel.")
sentence_chunks(policy, max_chars=90, overlap=1)
# ['Cancel at least 24 hours before your appointment. Late cancellations are charged in full.',
#  'Late cancellations are charged in full. We waive the fee for illness.',
#  'We waive the fee for illness. Call reception to cancel.']
```
