A CRM loads customer records from a slow database. Two parts of the program asking for the same
customer at the same time should get the **same** object, so an edit made through one is seen by
the other. But a plain dict cache would keep every customer ever loaded in memory forever.

Write `RecordCache(loader)`, where `loader(customer_id)` loads a record from the database:

- `cache.get(customer_id)` returns the cached record if one is still alive, and otherwise calls
  `loader` and caches what it returns.
- The cache must not keep records alive: once nothing outside the cache refers to a record, it's
  freed and the next `get` loads it again.
- `len(cache)` is the number of records currently alive in the cache.

```python
calls = []

def load_customer(customer_id):
    calls.append(customer_id)
    return Customer(customer_id, name="Ada")

cache = RecordCache(load_customer)
ada = cache.get("C-1")
cache.get("C-1") is ada    # True, and calls == ["C-1"]
len(cache)                 # 1
del ada
len(cache)                 # 0
cache.get("C-1")           # loads again: calls == ["C-1", "C-1"]
```
