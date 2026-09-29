"""Job tracker: companies, applications and interview stages, with a weekly report.

The black belt grading for pylearn's Python track. Start here, then split this file into the
package layout in the brief (models, schemas, api, report) as it grows.

Run it locally:

    uv run uvicorn jobtracker:build_app --factory --reload

and open http://127.0.0.1:8000/docs.
"""

import os
from datetime import date, datetime, timedelta
from typing import Literal

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import ForeignKey, String, create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, selectinload, sessionmaker

# ---------------------------------------------------------------------------
# The rules
# ---------------------------------------------------------------------------

Status = Literal["applied", "interviewing", "offer", "accepted", "rejected", "withdrawn"]
Source = Literal["job board", "referral", "recruiter", "direct"]
StageKind = Literal["phone screen", "technical", "take-home", "onsite", "final"]
Outcome = Literal["pending", "passed", "failed"]

# Where an application may go next from each status. The last three are closed.
TRANSITIONS: dict[str, set[str]] = {
    "applied": {"interviewing", "rejected", "withdrawn"},
    "interviewing": {"offer", "rejected", "withdrawn"},
    "offer": {"accepted", "rejected", "withdrawn"},
    "accepted": set(),
    "rejected": set(),
    "withdrawn": set(),
}
ACTIVE: tuple[str, ...] = ("applied", "interviewing", "offer")

REPORT_COLUMNS = ["week", "applied", "responses", "interviews", "offers", "response_rate", "stages"]


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    website: Mapped[str | None]
    applications: Mapped[list["Application"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class Application(Base):
    """One job applied for.

    Columns: id, company_id (a foreign key, indexed), role, source, status (default "applied"),
    applied_on (a date), salary_min and salary_max (optional ints), notes (default "").
    Relationships: company (back to Company) and stages (Stage objects in scheduled order,
    deleted with the application).
    """

    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)
    company: Mapped[Company] = relationship(back_populates="applications")
    # TODO: the rest of the columns, and stages


class Stage(Base):
    """One interview stage of an application.

    Columns: id, application_id (a foreign key, indexed), kind, scheduled_at (a datetime),
    outcome (default "pending"), notes (default ""). Relationship: application.
    """

    __tablename__ = "stages"

    id: Mapped[int] = mapped_column(primary_key=True)
    # TODO


# ---------------------------------------------------------------------------
# Request and response models
# ---------------------------------------------------------------------------


class CompanyIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    website: str | None = None


class CompanyOut(BaseModel):
    id: int
    name: str
    website: str | None
    applications: int  # how many applications, of any status
    active: int  # how many are still applied, interviewing or offer


# TODO: ApplicationIn (with the salary range check), ApplicationUpdate, ApplicationOut,
# StageIn, StageUpdate, StageOut and WeekRow, as described in the brief.


# ---------------------------------------------------------------------------
# The weekly report
# ---------------------------------------------------------------------------


def weekly_report(session: Session, today: date, weeks: int = 4) -> pd.DataFrame:
    """One row per week (weeks start on Monday) for the `weeks` weeks ending with the one that
    contains `today`, oldest first, with the columns in REPORT_COLUMNS. See the brief for what
    each column counts. Let SQL select the rows in the window; let pandas do the rest."""
    raise NotImplementedError


# ---------------------------------------------------------------------------
# The API
# ---------------------------------------------------------------------------


def get_session(request: Request):
    """One session per request, from the app's session factory, closed afterwards."""
    with request.app.state.sessions() as session:
        yield session


def create_app(engine) -> FastAPI:
    """The app, backed by this engine. Tests pass a fresh in-memory engine."""
    app = FastAPI(title="Job tracker")
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)

    @app.post("/companies", status_code=status.HTTP_201_CREATED, response_model=CompanyOut)
    def create_company(body: CompanyIn, session: Session = Depends(get_session)):
        company = Company(name=body.name.strip(), website=body.website)
        session.add(company)
        try:
            session.commit()
        except IntegrityError:
            raise HTTPException(status.HTTP_409_CONFLICT, f"A company called {body.name!r} already exists") from None
        return CompanyOut(id=company.id, name=company.name, website=company.website, applications=0, active=0)

    @app.get("/companies/{company_id}", response_model=CompanyOut)
    def get_company(company_id: int, session: Session = Depends(get_session)):
        company = session.get(Company, company_id)
        if company is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Company {company_id} not found")
        # TODO: count with a query instead of loading every application
        total = len(company.applications)
        active = sum(1 for application in company.applications if application.status in ACTIVE)
        return CompanyOut(id=company.id, name=company.name, website=company.website, applications=total, active=active)

    # TODO: GET /companies, DELETE /companies/{company_id}
    # TODO: POST /applications, GET /applications, GET/PATCH/DELETE /applications/{application_id}
    # TODO: POST /applications/{application_id}/stages, PATCH /stages/{stage_id}
    # TODO: GET /reports/weekly and GET /reports/weekly.csv

    return app


def build_app() -> FastAPI:
    """The app uvicorn serves: the database named by JOBTRACKER_DATABASE_URL, or jobs.db here.
    The schema comes from your Alembic migrations (alembic upgrade head), never create_all."""
    return create_app(create_engine(os.environ.get("JOBTRACKER_DATABASE_URL", "sqlite:///jobs.db")))
