A client that retries failed API calls waits a little longer after each failure. Write a generator
function `backoff(base, factor=2, cap=60)` that yields the delays in seconds:

- the first delay is `base`, and each one after it is the previous one times `factor`,
- no delay is ever more than `cap`: once the delays reach it, every delay after that is `cap`,
- it never ends. The caller takes as many delays as it has retries.

```python
from itertools import islice

list(islice(backoff(1), 6))           # [1, 2, 4, 8, 16, 32]
list(islice(backoff(10, cap=60), 5))  # [10, 20, 40, 60, 60]
```
