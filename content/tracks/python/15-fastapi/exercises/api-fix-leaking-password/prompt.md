A security review of the job board's recruiter accounts found this in a response:

```json
{"id": 1, "email": "grace@harbourfreight.example", "name": "Grace", "company": "Harbour Freight",
 "password_hash": "6b86b273ff34fce19d6b804eff5a3f57...", "verified": false}
```

All three recruiter endpoints return the stored record as it is, password hash included. Fix them
so that every response contains exactly these fields and no others:

```text
id, email, name, company, verified
```

- `POST /recruiters` still returns `201` with the new recruiter.
- `GET /recruiters/{recruiter_id}` returns one recruiter.
- `GET /recruiters` returns a list of them.

Keep storing the hash: the login code (not shown) needs it. It just must never leave the service.
