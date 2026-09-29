The billing API pages its invoices with an offset and a limit:

```text
GET /v1/invoices?status=open&offset=0&limit=100
→ {"data": [{"id": "inv_001", "amount_due": 4200}, ...], "total": 250}
```

Write a generator `iter_invoices(client, *, status="open", limit=100)` that yields every invoice
with that status, one at a time, in the order the API returns them.

- Send `status`, `offset` and `limit` on every request, starting at offset 0.
- Stop once the offset reaches `total`, or as soon as a page comes back empty.
- Raise `httpx.HTTPStatusError` if any page fails.
- Be lazy: fetch a page only when the caller wants an item from it.

```python
invoices = iter_invoices(client)
next(invoices)              # {"id": "inv_001", "amount_due": 4200}   (one request so far)
len(list(invoices))         # 249                                      (three requests in all)
```
