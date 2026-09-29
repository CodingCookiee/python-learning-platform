Analytics groups a visitor's clicks into **sessions**: a new session starts whenever more than 30
minutes pass between one click and the next. Write a generator function
`sessions(clicks, gap=timedelta(minutes=30))`:

- `clicks` is an iterable of `(timestamp, path)` tuples in time order, where `timestamp` is a
  `datetime`. It may be a live stream that never ends.
- It yields one list of clicks per session, in order.
- A gap of exactly `gap` doesn't start a new session; only a longer one does.
- It's lazy. A session is yielded as soon as the click that starts the next one arrives, so the
  first session is available long before an endless stream finishes.

```python
from datetime import datetime

clicks = [
    (datetime(2026, 9, 28, 9, 0), "/home"),
    (datetime(2026, 9, 28, 9, 5), "/shop"),
    (datetime(2026, 9, 28, 11, 0), "/home"),
    (datetime(2026, 9, 28, 11, 20), "/cart"),
]
[[path for _, path in session] for session in sessions(clicks)]
# [["/home", "/shop"], ["/home", "/cart"]]
```
