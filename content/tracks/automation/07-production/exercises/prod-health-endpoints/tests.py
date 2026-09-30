import httpx
from plp import hidden, test
from solution import Settings, create_app

SETTINGS = Settings("client-key-for-tests", "claude-haiku-4-5", "support-v12")
KEY = {"X-API-Key": "client-key-for-tests"}
ANSWER = "Refunds reach your card within 14 days."


class Pipeline:
    def __init__(self, fail=False):
        self.questions, self.fail = [], fail

    def __call__(self, question):
        self.questions.append(question)
        if self.fail:
            raise TimeoutError("provider timed out; key sk-ant-test-4f9a")
        return ANSWER


def client(app):
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


@test("Answers the example with its model and prompt version, and /healthz is ok")
async def _():
    app = create_app(SETTINGS, Pipeline(), {"queue": lambda: True, "config": lambda: True})
    async with client(app) as http:
        health = await http.get("/healthz")
        response = await http.post("/v1/answer", json={"question": "How long do refunds take?"}, headers=KEY)
    assert (health.status_code, health.json()) == (200, {"status": "ok"})
    assert (response.status_code, response.json()) == (200, {"answer": ANSWER, "model": "claude-haiku-4-5", "prompt_version": "support-v12"})


@test("/healthz calls nothing, even when a dependency is down")
async def _():
    pipeline, calls = Pipeline(fail=True), []
    app = create_app(SETTINGS, pipeline, {"queue": lambda: calls.append("queue") or False})
    async with client(app) as http:
        response = await http.get("/healthz")
    assert (response.status_code, response.json()) == (200, {"status": "ok"})
    assert (pipeline.questions, calls) == ([], [])


@test("/readyz reports each check, and 503 when one fails or raises")
async def _():
    def broken():
        raise ConnectionError("redis://redis:6379 refused")

    pipeline = Pipeline()
    ready = create_app(SETTINGS, pipeline, {"queue": lambda: True, "config": lambda: True})
    not_ready = create_app(SETTINGS, pipeline, {"queue": broken, "config": lambda: True, "budget": lambda: False})
    async with client(ready) as http:
        good = await http.get("/readyz")
    async with client(not_ready) as http:
        bad = await http.get("/readyz")
    assert (good.status_code, good.json()) == (200, {"status": "ready", "checks": {"queue": "ok", "config": "ok"}})
    assert (bad.status_code, bad.json()) == (503, {"status": "not ready", "checks": {"queue": "failed", "config": "ok", "budget": "failed"}})
    assert pipeline.questions == []


@test("/v1/answer needs the right API key")
async def _():
    pipeline = Pipeline()
    app = create_app(SETTINGS, pipeline, {})
    async with client(app) as http:
        missing = await http.post("/v1/answer", json={"question": "Refund time?"})
        wrong = await http.post("/v1/answer", json={"question": "Refund time?"}, headers={"X-API-Key": "guess"})
    assert (missing.status_code, wrong.status_code) == (401, 401)
    assert pipeline.questions == []


@hidden("A failing pipeline is a 503 that reveals nothing")
async def _():
    app = create_app(SETTINGS, Pipeline(fail=True), {})
    async with client(app) as http:
        response = await http.post("/v1/answer", json={"question": "Refund time?"}, headers=KEY)
    assert response.status_code == 503
    assert response.json() == {"detail": "The assistant is unavailable, try again shortly"}
    assert "sk-ant" not in response.text and "timed out" not in response.text


@hidden("Empty or oversized questions are rejected before the pipeline runs")
async def _():
    pipeline = Pipeline()
    app = create_app(SETTINGS, pipeline, {})
    async with client(app) as http:
        empty = await http.post("/v1/answer", json={"question": ""}, headers=KEY)
        huge = await http.post("/v1/answer", json={"question": "x" * 2001}, headers=KEY)
    assert (empty.status_code, huge.status_code) == (422, 422)
    assert pipeline.questions == []
