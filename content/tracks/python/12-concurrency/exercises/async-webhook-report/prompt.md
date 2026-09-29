When an order ships, the shop notifies every partner by webhook. Write
`deliver_all(client, webhooks)`, which posts to every webhook **at the same time** and reports how
each one went. Each webhook is a dict with an `"id"` and a `"url"`, and `await client.post(url)`
returns the HTTP status code, or raises if the partner can't be reached.

Return a dict with two keys:

- `"delivered"`: the ids that got a status from 200 to 299, in the order given.
- `"failed"`: a dict of id to reason, in the order given. The reason is `"HTTP 503"` for any other
  status, or the exception's type and message for a request that raised, such as
  `"ConnectionError: connection refused"`.

One failure must not stop the others from being delivered or reported.

```python
await deliver_all(client, [
    {"id": "wh_warehouse", "url": "https://warehouse.example.com/hooks"},
    {"id": "wh_erp", "url": "https://erp.example.com/hooks"},
    {"id": "wh_crm", "url": "https://crm.example.com/hooks"},
])
# {"delivered": ["wh_warehouse", "wh_crm"],
#  "failed": {"wh_erp": "ConnectionError: connection refused"}}
```
