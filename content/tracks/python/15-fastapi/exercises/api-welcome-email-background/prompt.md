The job board's signup endpoint sends a welcome email before it answers. The mail server is slow,
and when it refuses an address the whole signup fails with a `500`, even though the account was
created.

Change `POST /signups` so the email is sent as a **background task**, after the response:

- The endpoint still answers `201` with `{"email": ..., "status": "active"}`.
- `send_welcome_email(email, name)` (written for you) runs after the response is sent.
- A mail server that refuses the address no longer affects the response: it's still a `201`.
- A signup that fails validation sends no email.

```text
POST /signups  {"email": "ada@example.com", "name": "Ada"}       ->  201, and then outbox has Ada's email
POST /signups  {"email": "grace@bounce.example", "name": "Grace"} ->  201 (the email fails afterwards)
```
