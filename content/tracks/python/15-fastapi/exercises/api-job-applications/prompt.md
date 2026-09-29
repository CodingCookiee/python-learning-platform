Tidewater Tours is hiring, and its careers page posts applications to a small API. The hiring team's
dashboard lists them, but it must not show email addresses or cover letters: those are only opened
once someone is shortlisted.

**Models**

- `ApplicationCreate`, the body of a new application: `name` (1 to 100 characters), `email` (text),
  `role` (exactly `"backend-engineer"`, `"data-analyst"` or `"tour-guide"`) and `cover_letter` (at
  most 2000 characters).
- `ApplicationRead`, what every response contains: `id`, `name`, `role` and `status`.

**Endpoints**

- `POST /applications` stores the application in `applications` as a dict with every field,
  plus `"id"` (1 for the first, then 2, 3…) and `"status": "received"`. It answers `201` with the
  `ApplicationRead`. A client can't choose its own status.
- `GET /applications` returns the list of `ApplicationRead`s, oldest first. The optional `role`
  query parameter keeps only that role; an unknown role is refused with `422`.
- `GET /applications/{application_id}` returns one `ApplicationRead` (you can assume it exists).

```text
POST /applications  {"name": "Grace Hopper", "email": "grace@example.com",
                     "role": "backend-engineer", "cover_letter": "I wrote the first compiler..."}
                ->  201 {"id": 1, "name": "Grace Hopper", "role": "backend-engineer", "status": "received"}

GET /applications?role=data-analyst   ->  200 [...]
GET /applications?role=astronaut      ->  422
```
