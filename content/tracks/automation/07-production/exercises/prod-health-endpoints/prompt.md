The support bot is going on Fly.io, which restarts instances that fail `/healthz` and holds traffic
back from ones that fail `/readyz`. The current health check calls the model every ten seconds,
which costs money and marks every instance dead whenever the provider has a blip. Finish
`create_app(settings, answer, checks)`:

- `GET /healthz` returns `200 {"status": "ok"}`. It calls nothing: no model, no checks.
- `GET /readyz` runs every function in `checks` (a dict of name to a function returning `True` or
  `False`; one that raises counts as failed). All passing: `200 {"status": "ready", "checks": {...}}`.
  Any failing: `503 {"status": "not ready", "checks": {...}}`. Each check's entry is `"ok"` or
  `"failed"`. It never calls the model.
- `POST /v1/answer` with `{"question": "..."}` requires an `X-API-Key` header equal to
  `settings.service_api_key` (compared with `hmac.compare_digest`), or it's a `401`. It returns
  `{"answer": ..., "model": settings.model, "prompt_version": settings.prompt_version}`. If
  `answer` raises, return `503` with the detail `"The assistant is unavailable, try again shortly"`,
  and nothing from the exception.

```python
app = create_app(Settings("client-key-for-tests", "claude-haiku-4-5", "support-v12"),
                 answer=lambda question: "Refunds reach your card within 14 days.",
                 checks={"queue": lambda: True, "config": lambda: True})
# GET /healthz                               -> 200 {"status": "ok"}
# POST /v1/answer with the key and a question -> 200 {"answer": "Refunds reach ...", "model": "claude-haiku-4-5", "prompt_version": "support-v12"}
```
