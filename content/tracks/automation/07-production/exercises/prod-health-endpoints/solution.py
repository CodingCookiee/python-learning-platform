import hmac
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


def create_app(settings: Settings, answer, checks: dict) -> FastAPI:
    """The support bot as a service: the work, a liveness check and a readiness check."""
    app = FastAPI()

    def authenticated(x_api_key: str = Header(default="")):
        if not hmac.compare_digest(x_api_key.encode(), settings.service_api_key.encode()):
            raise HTTPException(status_code=401, detail="Invalid API key")

    @app.get("/healthz")
    def healthz():
        return {"status": "ok"}

    @app.get("/readyz")
    def readyz():
        results = {}
        for name, check in checks.items():
            try:
                results[name] = "ok" if check() else "failed"
            except Exception:
                log.exception("Readiness check %s raised", name)
                results[name] = "failed"
        ready = all(result == "ok" for result in results.values())
        return JSONResponse(
            {"status": "ready" if ready else "not ready", "checks": results},
            status_code=200 if ready else 503,
        )

    @app.post("/v1/answer", dependencies=[Depends(authenticated)])
    def post_answer(body: Question):
        try:
            text = answer(body.question)
        except Exception:
            log.exception("The pipeline failed")
            raise HTTPException(status_code=503, detail="The assistant is unavailable, try again shortly")
        return {"answer": text, "model": settings.model, "prompt_version": settings.prompt_version}

    return app
