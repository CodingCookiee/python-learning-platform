The support desk's ticket queue takes from the front of a list and pushes urgent tickets onto the
front. Both of those shift every ticket behind them, so the queue gets slower the longer it grows,
and on a bad day it holds tens of thousands of tickets.

```python
queue = TicketQueue()
queue.add("T-101: refund not received")
queue.add("T-102: change delivery address")
queue.add("T-103: card charged twice", urgent=True)
[queue.take() for _ in range(3)]
# ['T-103: card charged twice', 'T-101: refund not received', 'T-102: change delivery address']
```

Refactor `TicketQueue` so `self._tickets` is a `collections.deque`, and adding or taking at
either end is O(1). Everything must behave exactly as it does now, including an `IndexError` when
you `take()` or `peek()` from an empty queue.
