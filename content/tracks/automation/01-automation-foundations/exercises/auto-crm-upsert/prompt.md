The agency keeps its contacts in an Airtable base. Write
`upsert_contact(client, base_id, lead, *, sleep=time.sleep)` that makes sure the CRM has exactly one
contact for the lead's email address, and returns `(record_id, "created")` or
`(record_id, "updated")`.

`client` is an `httpx.Client` with `base_url` `https://api.airtable.com/v0` and auth already set up.
`lead` has `"email"`, `"name"`, and optionally `"company"` and `"phone"`.

1. **Find.** `GET /<base_id>/Contacts` with the query parameter
   `filterByFormula={Email}='<email>'`. Normalise the email first (strip spaces, lower case), and
   escape any `'` in it as `\'`. The answer is `{"records": [{"id": ..., "fields": {...}}, ...]}`.
2. **Write.** The fields are `{"Email": ..., "Name": ..., "Company": ..., "Phone": ...}`, with the
   normalised email, and **only** for values the lead actually has: a missing, `None` or empty value
   is left out, so it never wipes what the sales team typed. If a record was found,
   `PATCH /<base_id>/Contacts/<record id>` with `{"fields": fields}`; otherwise
   `POST /<base_id>/Contacts` with `{"fields": fields}`. Both answer with the record, which has an
   `"id"`.
3. **Rate limits.** Airtable allows 5 requests a second. Any request answered with `429` is
   retried after `sleep(seconds)`, using the `Retry-After` header when there is one and 30 seconds
   when there isn't, up to **3 attempts** per request. After that, or for any other error status,
   raise httpx's `HTTPStatusError`.

```python
upsert_contact(client, "appAgency", {"email": " Amira@Example.com ", "name": "Amira Haddad", "company": "Haddad Physio"})
# ("recNEW1", "created")    the first time
# ("recNEW1", "updated")    every time after that
```
