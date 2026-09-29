A service caches parsed orders in memory, and someone estimated the cache's size with
`sys.getsizeof` and got a number a hundred times too small. Write `deep_size(obj)`, the total
`sys.getsizeof` of `obj` and of everything reachable from it:

- From a `list`, `tuple`, `set` or `frozenset`, follow each item.
- From a `dict`, follow each key and each value.
- From any other object with a `__dict__`, follow its `__dict__` (and count that dict too).
- Anything else counts only its own size.
- Count each distinct object **once**, however many times it's reachable, so shared values
  aren't double-counted and a structure that contains itself doesn't loop forever.

```python
import sys

note = "gift wrap" * 100
order = {"id": "A1042", "notes": [note, note]}

deep_size(order) == (sys.getsizeof(order) + sys.getsizeof("id") + sys.getsizeof("A1042")
                     + sys.getsizeof("notes") + sys.getsizeof(order["notes"]) + sys.getsizeof(note))
# True: note is counted once, although the list holds it twice
```
