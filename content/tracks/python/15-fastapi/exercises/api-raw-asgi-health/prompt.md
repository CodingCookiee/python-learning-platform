Write the booking service's health check as a raw ASGI app, with no framework at all, to see what
FastAPI does for you.

`app(scope, receive, send)` is an async function. It answers HTTP requests like this:

| Request | Status | JSON body |
|---------|--------|-----------|
| `GET /health` | `200` | `{"status": "ok"}` |
| any other method on `/health` | `405` | `{"detail": "Method Not Allowed"}`, plus an `allow: GET` header |
| any other path | `404` | `{"detail": "Not Found"}` |

Every response has a `content-type: application/json` header.

```text
GET /health      ->  200 {"status": "ok"}
POST /health     ->  405 {"detail": "Method Not Allowed"}
GET /bookings    ->  404 {"detail": "Not Found"}
```

Don't import FastAPI or Starlette: the point is to do it by hand.
