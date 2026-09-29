The CRM service stores customers through a session, as a real database library would: changes are
only saved when the session is committed. The `Database` and `Session` classes stand in for the
database, and each records what happens to it in `database.log`.

Write the `get_session` dependency, which both endpoints already use:

- It opens one session per request with `database.session()` and gives it to the endpoint.
- If the endpoint finishes without an error, it commits the session.
- If the endpoint raises any exception, it rolls the session back, and the exception still reaches
  FastAPI, so the client gets the endpoint's error response.
- Either way, it closes the session.

```text
POST /customers  {"email": "ada@kilncafe.example", "name": "Ada"}   ->  201
database.log  ->  ["open", "commit", "close"]

POST /customers  the same email again                             ->  409
database.log  ->  ["open", "rollback", "close"]
```

`POST /customers/import` adds several customers in one request and refuses the whole batch with a
`409` if any email is already registered. Thanks to the rollback, a refused batch saves nothing.
