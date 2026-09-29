The fulfilment job looks up hundreds of orders a night, and each kind of failure currently crashes
it with a different exception. It wants exactly two outcomes to deal with: an order (or `None` if
there's no such order), or one `OrderLookupError` that says what went wrong.

Write `find_order(client, order_id)`. It sends `GET /orders/<order_id>` with the given client, and:

| The shop | `find_order` |
|----------|--------------|
| answers `200` with JSON | returns the JSON as a dict |
| answers `404` | returns `None` |
| answers any other `4xx` or `5xx` | raises `OrderLookupError("order 1043: HTTP 503")` |
| doesn't answer in time | raises `OrderLookupError("order 1045: timed out")` |
| can't be reached, or drops the connection | raises `OrderLookupError("order 1046: can't reach the shop")` |
| answers `200` with a body that isn't JSON | raises `OrderLookupError("order 1048: response wasn't JSON")` |

Each `OrderLookupError` is raised **from** the exception that caused it, so the original is still
there for the logs. Any other exception is a bug in the code, not a failed lookup: let it propagate
unchanged.

```python
find_order(client, 1042)   # {"id": 1042, "status": "paid", "total": "18.50"}
find_order(client, 9999)   # None
find_order(client, 1043)   # OrderLookupError: order 1043: HTTP 503
```
