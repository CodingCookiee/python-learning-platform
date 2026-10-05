"""Sessions per request, and the app uvicorn serves."""

import os
from collections.abc import Iterator

from fastapi import FastAPI, Request
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

DEFAULT_URL = "sqlite:///jobs.db"


def database_url() -> str:
    return os.environ.get("JOBTRACKER_DATABASE_URL", DEFAULT_URL)


def get_session(request: Request) -> Iterator[Session]:
    """One session per request, from the app's session factory, closed afterwards."""
    with request.app.state.sessions() as session:
        yield session


def build_app() -> FastAPI:
    """The app uvicorn serves: the database named by JOBTRACKER_DATABASE_URL, or jobs.db here.
    The schema comes from the Alembic migrations (alembic upgrade head), never create_all."""
    from jobtracker.api import create_app

    return create_app(create_engine(database_url()))
