# Job tracker

A FastAPI and SQLAlchemy service that records the companies you apply to, each application and
every interview stage, enforces the status rules, and builds a weekly report with pandas.

## Install and migrate

    uv sync
    uv run alembic upgrade head

The database is `jobs.db`, or whatever `JOBTRACKER_DATABASE_URL` names.

## Run

    uv run uvicorn jobtracker:build_app --factory --reload

## Test

    uv run pytest --cov=jobtracker
