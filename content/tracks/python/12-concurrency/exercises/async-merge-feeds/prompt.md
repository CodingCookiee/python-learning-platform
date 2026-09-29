The operations dashboard watches several event streams at once: payments, refunds, chargebacks.
Each one is an async iterable. Write an async generator `merge(*feeds)` that yields every event
from every feed **as it arrives**, whichever feed it came from:

- Read all the feeds at the same time. Events come out in the order they arrived, not feed by
  feed.
- It ends when every feed has run out.
- If a feed raises, `merge` raises that exception, and stops reading the other feeds.
- If the consumer stops early and closes the generator (with `aclosing`, say), every feed it was
  reading is closed too: no background task is left reading a feed nobody listens to.

```python
async for event in merge(payments, refunds):
    print(event)
# pay-1       (arrived at 0.01 s)
# ref-1       (0.03 s)
# pay-2       (0.06 s)
```
