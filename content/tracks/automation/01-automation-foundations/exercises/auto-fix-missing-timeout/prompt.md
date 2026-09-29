The agency's lead worker calls `make_client(token)` once at start-up and then
`push_lead(client, lead)` for each queued lead. Someone set `timeout=None` "because the CRM is
slow on Mondays". Last Monday the CRM accepted a connection and never answered, and the worker sat
on that one request for six hours while 140 leads piled up behind it.

Fix both functions:

- `make_client` must give the client a timeout: at most **10 seconds** for reads, and at most
  **5 seconds** to connect.
- When a request to the CRM times out, `push_lead` must not crash the worker. It logs a warning
  that includes the lead's email, and returns `None` so the worker leaves the lead in the queue
  for the next run:

```python
push_lead(client, {"email": "amira@example.com", "name": "Amira Haddad"})
# None, and logs: WARNING CRM request timed out for amira@example.com
```

A successful call still returns the new contact's id, and other HTTP errors (a `500`, say) still
raise.
