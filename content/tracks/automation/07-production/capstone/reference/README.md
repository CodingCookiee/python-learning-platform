# Kiln & Co support bot, hardened

A small RAG support bot with an eval suite and release gate, tracing, per-user and per-day budgets,
output filtering, a red-team suite and a FastAPI service.

## Run it offline

```bash
pip install -r requirements.txt
python harden.py          # eval gate, red team and cost summary against the scripted model
python -m pytest -q tests
```

## With a real model

Put your A2 client in `llm.py` (with a `make_llm()` factory) and set `ANTHROPIC_API_KEY` or
`OPENAI_API_KEY` in the environment, then run `python harden.py`.

## As a service

```bash
export SERVICE_API_KEY=... USER_REF_KEY=...
docker build -t support-bot . && docker run --env-file .env -p 8000:8000 support-bot
curl -s localhost:8000/healthz
curl -s -X POST localhost:8000/v1/answer -H "X-API-Key: $SERVICE_API_KEY" \
     -H "Content-Type: application/json" -d '{"question": "How long do refunds take?"}'
```

Settings come from the environment and are checked at start-up: `SERVICE_API_KEY`, `USER_REF_KEY`,
`MODEL`, `PROMPT_VERSION`, `PER_USER_DAILY_USD`, `PER_DAY_USD`.
