Every Monday the mailing tool gets an export of the CRM's contacts, and the marketing team has
noticed it's always short. With 120 contacts it sends 100; the new sandbox account, with 30
contacts, sends none at all.

The CRM uses cursor pagination:

```text
GET /v1/contacts?limit=50               → {"data": [...50...], "has_more": true,  "next_cursor": "c_50"}
GET /v1/contacts?limit=50&cursor=c_50   → {"data": [...50...], "has_more": true,  "next_cursor": "c_100"}
GET /v1/contacts?limit=50&cursor=c_100  → {"data": [...20...], "has_more": false, "next_cursor": null}
```

Fix `iter_contacts` so that it yields every contact, still lazily, and still makes exactly one
request per page.

```python
len(list(iter_contacts(client)))   # 120 with three pages, 30 with one
```
