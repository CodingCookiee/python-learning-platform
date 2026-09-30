import logging
from dataclasses import dataclass

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Settings:
    service_api_key: str
    model: str
    prompt_version: str


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


def create_app(settings, answer, checks):
    """The support bot as a service: the work, a liveness check and a readiness check."""
    app = FastAPI()

    @app.get("/healthz")
    def healthz():
        answer("ping")
        return {"status": "ok", "checks": {name: check() for name, check in checks.items()}}

    @app.post("/v1/answer")
    def post_answer(body: Question):
        return {"answer": answer(body.question)}

    return app
