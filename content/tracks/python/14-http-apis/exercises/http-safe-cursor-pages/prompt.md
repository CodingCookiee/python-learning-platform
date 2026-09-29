The helpdesk API pages tickets with a cursor:

```text
GET /v1/tickets?limit=100                 → {"tickets": [...], "next_cursor": "t_8841"}
GET /v1/tickets?limit=100&cursor=t_8841   → {"tickets": [...], "next_cursor": null}
```

Last month a bug in the helpdesk returned the same `next_cursor` over and over, and the sync job
fetched the same page 40,000 times before anyone noticed. Write a generator that follows the cursor
but refuses to be fooled:

```python
iter_tickets(client, *, limit=100, max_pages=1000)
```

- Yield every ticket, in order, fetching pages lazily. The last page has `"next_cursor": null`.
- If the server hands back a cursor you've already requested, raise `PaginationError` naming it
  (`cursor 't_8841' was already fetched`) instead of requesting it again.
- If there would be more than `max_pages` pages, raise `PaginationError` (`more than 1000 pages`)
  instead of requesting page `max_pages + 1`.
- Either way, every ticket from the pages already fetched has been yielded before the error.
- Raise `httpx.HTTPStatusError` for a failed page.

`PaginationError` is in the starter.

```python
seen = []
try:
    for ticket in iter_tickets(looping_client, limit=2):
        seen.append(ticket["id"])
except PaginationError as error:
    print(error, seen)   # cursor 't_2' was already fetched ['tk_1', 'tk_2', 'tk_3', 'tk_4']
```
