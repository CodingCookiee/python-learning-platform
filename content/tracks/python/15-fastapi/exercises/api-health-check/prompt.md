Load balancers and uptime monitors check a service by calling its health endpoint every few
seconds. Give the booking service one.

Add a path operation to `app` so that `GET /health` responds `200` with this JSON body:

```json
{"status": "ok"}
```

```text
GET /health       ->  200 {"status": "ok"}
POST /health      ->  405 (FastAPI does this part for you)
```
