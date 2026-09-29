A worker pool pulls jobs from several customers' queues. To stop one busy customer starving the
others, it takes one job from each queue in turn. Write an iterator class `RoundRobin(*queues)`:

- It yields the first job of each queue in order, then the second of each, and so on.
- A queue that runs out is skipped from then on; the others carry on.
- Each queue can be any iterable, including a generator that never ends, so `RoundRobin` must
  never read ahead: it takes a job from a queue only when it's about to return it, and creating
  a `RoundRobin` reads nothing at all.
- It's an iterator: `iter()` returns the object itself.

```python
jobs = RoundRobin(["a1", "a2"], ["b1"], ["c1", "c2", "c3"])
list(jobs)
# ["a1", "b1", "c1", "a2", "c2", "c3"]
```
