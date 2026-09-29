The CRM's docs describe creating a contact like this:

```text
POST /v1/contacts
Content-Type: application/json

{"name": "Ada Lovelace", "email": "ada@example.com", "tags": ["vip"]}

→ 201 Created, with the new contact as JSON
→ 422 Unprocessable Entity, with {"error": "..."} if a field is invalid
```

`create_contact(client, name, email, tags=())` was written without reading them. It sends a `GET`
with everything in the query string, the CRM answers `405 Method Not Allowed`, and the function
returns the error body as if it were a contact:

```python
create_contact(client, "Ada Lovelace", "ada@example.com", ["vip"])
# {"error": "method not allowed"}   ← should be the new contact
```

Fix it so that it:

- sends exactly the request the docs describe, with `tags` as a JSON list (empty if none are given)
  and no query string,
- returns the new contact (the response's JSON) when the CRM answers `201`,
- raises `ValueError` whose message includes the CRM's error message for any other status.

The `client` already has the CRM's base URL, so use the path `/v1/contacts`.

```python
create_contact(client, "Ada Lovelace", "ada@example.com", ["vip"])
# {"id": "c_1", "name": "Ada Lovelace", "email": "ada@example.com", "tags": ["vip"]}
```
