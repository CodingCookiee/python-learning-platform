---
slug: prod-deploy-and-monitor
title: Deploying and monitoring AI services
summary: Package the pipeline as a FastAPI service with health checks and environment config, ship it in Docker with a background worker, and alert on errors, cost anomalies and quality drift.
minutes: 55
exercises:
  - prod-predict-alerts
  - prod-health-endpoints
  - prod-error-rate-window
  - prod-cost-anomaly
  - prod-alert-manager
---

Everything so far runs on your laptop. The client needs the support bot on a server that answers
at 3 a.m., restarts itself when it crashes, keeps its keys somewhere safer than your shell history,
and tells somebody when it starts failing, costing too much, or quietly answering worse than last
month. This lesson packages the pipeline as a service, puts it in a container, sketches where to run
it, and then builds the monitoring that turns "the client noticed" into "we noticed first".

## The service

The pipeline becomes a FastAPI app (module 15) with three kinds of endpoint:

- **The work**: `POST /v1/answer`, authenticated with a per-client API key.
- **Liveness**, `GET /healthz`: "the process is up". It does nothing else, so the platform can
  restart a process that stops answering it.
- **Readiness**, `GET /readyz`: "I can do useful work": configuration loaded, the queue or database
  reachable. A platform stops sending traffic to an instance that isn't ready, without killing it.

Neither health check calls the model. A check that runs every ten seconds and costs a model call is
a bill, and a provider blip would mark every instance unhealthy at once.

```python
import asyncio
import hmac

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


def create_app(api_key, answer):
    app = FastAPI()

    def authenticated(x_api_key: str = Header(default="")):
        if not hmac.compare_digest(x_api_key.encode(), api_key.encode()):
            raise HTTPException(401, "Invalid API key")

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}

    @app.post("/v1/answer", dependencies=[Depends(authenticated)])
    def post_answer(body: Question):
        return {"answer": answer(body.question)}

    return app


async def main():
    app = create_app("client-key-for-tests", lambda question: "Refunds reach your card within 14 days.")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        health = await client.get("/healthz")
        denied = await client.post("/v1/answer", json={"question": "Refund time?"})
        allowed = await client.post("/v1/answer", json={"question": "Refund time?"}, headers={"X-API-Key": "client-key-for-tests"})
    return health.json(), denied.status_code, allowed.json()


asyncio.run(main())
```

The app is built by a factory that takes its dependencies (the key, the pipeline), so tests pass
fakes and production passes the real thing.

## Configuration from the environment

Everything that differs between your laptop, staging and the client's production goes in
environment variables: keys, model names, budgets, the Redis URL, the log level. The code reads
them once at start-up, validates them, and refuses to start if something required is missing.
That's far better than failing on the first customer request.

```python
from decimal import Decimal

from pydantic import BaseModel, SecretStr, ValidationError


class Settings(BaseModel):
    anthropic_api_key: SecretStr
    service_api_key: SecretStr
    model: str = "claude-haiku-4-5"
    prompt_version: str
    daily_budget_usd: Decimal = Decimal("100")


def load_settings(env):
    return Settings(**{name.lower(): value for name, value in env.items() if name.lower() in Settings.model_fields})


try:
    load_settings({"ANTHROPIC_API_KEY": "from-the-platform", "PROMPT_VERSION": "support-v12"})
except ValidationError as error:
    problem = [f"{e['loc'][0].upper()}: {e['msg']}" for e in error.errors()]
problem
```

On a real project, `pydantic-settings` does this mapping for you (`class Settings(BaseSettings)`),
and reads a `.env` file for local development. The `.env` file is listed in `.gitignore` and
`.dockerignore`; it never leaves your machine.

## Background workers

The web process should answer quickly. Slow work (the invoice batch, re-indexing documents for RAG,
nightly evals) runs in a separate **worker** process that takes jobs from the queue of lesson 4.
FastAPI's `BackgroundTasks` is fine for a tiny follow-up like sending one webhook, but it runs inside
the web process: a restart or a deploy loses whatever hadn't run. Anything that matters goes on a
durable queue, and the web process only enqueues it.

```yaml
# compose.yaml: the web app, a worker and Redis, all from one image
services:
  web:
    build: .
    env_file: .env
    ports: ["8000:8000"]
    depends_on: [redis]
  worker:
    build: .
    command: ["rq", "worker", "invoices", "--url", "redis://redis:6379/0"]
    env_file: .env
    depends_on: [redis]
  redis:
    image: redis:7-alpine
```

## A Dockerfile

One image runs both processes; only the command differs. This one uses uv (module 10) with a
locked dependency set, installs dependencies before copying the code so rebuilds are fast, runs as
a non-root user, and checks its own health:

```dockerfile
FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# Dependencies first: this layer is cached until the lockfile changes
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN uv sync --locked --no-dev

RUN useradd --create-home app
USER app
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')"
CMD ["uvicorn", "support_bot.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

There's no key anywhere in the image. Secrets arrive as environment variables when the container
starts, from the platform's secret store: `fly secrets set`, Railway and Render variables, or an
`.env` file readable only by the service user on a VPS. Anyone who can pull the image learns nothing.

## Where to deploy

| Target | Good for | Watch out for |
|--------|----------|---------------|
| **Fly.io** | Docker images close to users, health checks in `fly.toml`, `fly secrets` | Machines sleep if you let them; set a minimum for a bot that must answer at once |
| **Railway** | The quickest path from a repo to a URL, plus managed Redis and Postgres | Usage-based bills; set spending limits |
| **Render** | Web services, background workers and cron jobs as separate service types | Free instances sleep and cold-start slowly |
| **A VPS** (Hetzner, DigitalOcean) | Full control and a flat monthly price: Docker Compose plus Caddy for HTTPS | You patch it, back it up and watch its disk |

For most client automations, a managed platform is worth its price: health checks, restarts, TLS,
secrets and logs come built in. A VPS makes sense when the client wants a fixed cost or data kept
in a specific place.

> [!TIP]
> **Do it on your machine.** Install Docker, then:
>
> 1. Put the capstone's service (or the lesson's app) in a uv project with the Dockerfile above,
>    and create a `.env` with `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`), `SERVICE_API_KEY` and
>    `PROMPT_VERSION`. Check `.env` is in `.gitignore` and `.dockerignore`.
> 2. `docker build -t support-bot .` then `docker run --env-file .env -p 8000:8000 support-bot`.
> 3. `curl localhost:8000/healthz`, then `curl -X POST localhost:8000/v1/answer -H "X-API-Key: ..."
>    -H "Content-Type: application/json" -d '{"question": "How long do refunds take?"}'`.
> 4. `docker compose up` with the compose file above, and enqueue a job for the worker.
> 5. Deploy to one of the targets, set the secrets there, and point its health check at `/healthz`.
> 6. Read the platform's logs after a few requests: no keys, no emails, no message text.

## Monitoring and alerting

Once it's running, watch the numbers that tell you something is wrong before a customer does. Your
traces (lesson 3) and eval runs (lessons 1–2) already produce all of them:

| Signal | Alert when | Catches |
|--------|------------|---------|
| Error rate | Over 5% of requests in the last 5 minutes, with at least 20 requests | Provider outages, bad deploys |
| Latency (p95) | Over 8 s for 10 minutes | A slow provider, runaway agent loops |
| Fallback and breaker rate | The breaker opens, or over 20% of answers come from fallbacks | Degraded service that still "works" |
| Cost per day | Over 2× the median of the previous week | Loops, abuse, a prompt that grew |
| Queue depth, dead letters | Growing for 30 minutes, or any dead letter | Workers stuck or down, poisoned jobs |
| Quality | The nightly eval's pass rate below the floor two nights running | Drift: provider model updates, stale docs, a bad prompt change |

Quality drift is the one ordinary monitoring misses. Providers update models behind aliases, the
client's documents change, customers start asking new questions. Run the golden set every night
against production's configuration, chart the pass rate over time, and have a judge (lesson 2)
grade a small random sample of real, redacted production answers each day.

Alerts need two guards against noise: a **minimum volume** (two errors out of three requests at 3 a.m.
isn't an outage), and a **duration** (fire only after the condition holds for several checks in a row,
and send one message when it starts and one when it resolves, not one per check).

```python
from decimal import Decimal
from statistics import median

daily_cost = [Decimal(x) for x in ["38.10", "41.90", "40.20", "39.75", "43.00", "40.60", "42.30", "610.45"]]
baseline = median(daily_cost[-8:-1])
today = daily_cost[-1]
today > 2 * baseline, baseline
```

That's the $610 Monday from lesson 5, caught on Saturday morning instead.

```quiz
question: The support bot's error rate is 0% and latency is normal, but customers say answers got worse this week. Which signal should have caught it?
options:
  - The readiness check
  - The nightly eval pass rate and a judged sample of production answers
  - The cost-per-day alert
  - The container's HEALTHCHECK
answer: 1
explain: "A model can fail quietly: every request succeeds, quickly and cheaply, with worse answers. Only measuring quality, with the golden set every night and a judge on sampled real answers, shows drift."
```

## Where this leaves you

A production AI service is a FastAPI app built by a factory, with an authenticated work endpoint,
a liveness check that does nothing and a readiness check that never calls the model. Settings come
from the environment, validated at start-up, with secrets injected by the platform and never baked
into the image. One Docker image runs the web process and a queue worker. Fly.io, Railway, Render
or a VPS all run it; pick on operations and cost. Then watch error rate, latency, fallbacks, cost,
queues and quality, with minimum volumes and durations so alerts mean something. The drills predict
which alerts fire, build the health endpoints, a windowed error-rate monitor and a cost anomaly
check, and finish with an alert manager that fires and resolves once.
