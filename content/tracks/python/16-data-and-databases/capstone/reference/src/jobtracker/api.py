"""The HTTP API: routers for companies, applications, stages and reports, and create_app."""

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Response, status
from sqlalchemy import Engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload, sessionmaker

from jobtracker.db import get_session
from jobtracker.models import ACTIVE, OPEN_FOR_STAGES, TRANSITIONS, Application, Company, Stage, Status
from jobtracker.report import weekly_report
from jobtracker.schemas import (
    ApplicationIn,
    ApplicationOut,
    ApplicationUpdate,
    CompanyIn,
    CompanyOut,
    StageIn,
    StageOut,
    StageUpdate,
    WeekRow,
)

SessionDep = Annotated[Session, Depends(get_session)]
Sort = Literal["applied_on", "-applied_on", "company"]

companies = APIRouter(prefix="/companies", tags=["companies"])
applications = APIRouter(prefix="/applications", tags=["applications"])
stages = APIRouter(prefix="/stages", tags=["stages"])
reports = APIRouter(prefix="/reports", tags=["reports"])


def counts():
    """A select of each company with its application count and active count."""
    total = func.count(Application.id)
    active = func.count(Application.id).filter(Application.status.in_(ACTIVE))
    return select(Company, total, active).outerjoin(Company.applications).group_by(Company.id)


def company_out(company: Company, total: int, active: int) -> CompanyOut:
    return CompanyOut(id=company.id, name=company.name, website=company.website, applications=total, active=active)


def find_company(session: Session, company_id: int) -> Company:
    company = session.get(Company, company_id)
    if company is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Company {company_id} not found")
    return company


def find_application(session: Session, application_id: int) -> Application:
    application = session.get(Application, application_id)
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Application {application_id} not found")
    return application


@companies.post("", status_code=status.HTTP_201_CREATED, response_model=CompanyOut)
def create_company(body: CompanyIn, session: SessionDep) -> CompanyOut:
    company = Company(name=body.name.strip(), website=body.website)
    session.add(company)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, f"A company called {body.name!r} already exists") from None
    return company_out(company, 0, 0)


@companies.get("", response_model=list[CompanyOut])
def list_companies(session: SessionDep) -> list[CompanyOut]:
    rows = session.execute(counts().order_by(Company.name)).all()
    return [company_out(company, total, active) for company, total, active in rows]


@companies.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: int, session: SessionDep) -> CompanyOut:
    row = session.execute(counts().where(Company.id == company_id)).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Company {company_id} not found")
    return company_out(*row)


@companies.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(company_id: int, session: SessionDep) -> Response:
    session.delete(find_company(session, company_id))
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@applications.post("", status_code=status.HTTP_201_CREATED, response_model=ApplicationOut)
def create_application(body: ApplicationIn, session: SessionDep) -> ApplicationOut:
    company = find_company(session, body.company_id)
    application = Application(company=company, **body.model_dump(exclude={"company_id"}))
    session.add(application)
    session.commit()
    return ApplicationOut.of(application)


@applications.get("", response_model=list[ApplicationOut])
def list_applications(
    session: SessionDep,
    status_: Annotated[Status | None, Query(alias="status")] = None,
    company_id: int | None = None,
    sort: Sort = "applied_on",
) -> list[ApplicationOut]:
    stmt = select(Application).join(Application.company).options(
        selectinload(Application.stages), selectinload(Application.company)
    )
    if status_ is not None:
        stmt = stmt.where(Application.status == status_)
    if company_id is not None:
        stmt = stmt.where(Application.company_id == company_id)
    order = {
        "applied_on": (Application.applied_on, Application.id),
        "-applied_on": (Application.applied_on.desc(), Application.id.desc()),
        "company": (Company.name, Application.applied_on, Application.id),
    }[sort]
    return [ApplicationOut.of(application) for application in session.scalars(stmt.order_by(*order))]


@applications.get("/{application_id}", response_model=ApplicationOut)
def get_application(application_id: int, session: SessionDep) -> ApplicationOut:
    return ApplicationOut.of(find_application(session, application_id))


@applications.patch("/{application_id}", response_model=ApplicationOut)
def update_application(application_id: int, body: ApplicationUpdate, session: SessionDep) -> ApplicationOut:
    application = find_application(session, application_id)
    if body.status is not None and body.status != application.status:
        if body.status not in TRANSITIONS[application.status]:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Can't move an application from {application.status} to {body.status}",
            )
        application.status = body.status
    if body.notes is not None:
        application.notes = body.notes
    session.commit()
    return ApplicationOut.of(application)


@applications.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: int, session: SessionDep) -> Response:
    session.delete(find_application(session, application_id))
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@applications.post("/{application_id}/stages", status_code=status.HTTP_201_CREATED, response_model=ApplicationOut)
def add_stage(application_id: int, body: StageIn, session: SessionDep) -> ApplicationOut:
    application = find_application(session, application_id)
    if application.status not in OPEN_FOR_STAGES:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Can't add a stage to an application that is {application.status}"
        )
    application.stages.append(Stage(**body.model_dump()))
    if application.status == "applied":
        application.status = "interviewing"
    session.commit()
    return ApplicationOut.of(application)


@stages.patch("/{stage_id}", response_model=StageOut)
def update_stage(stage_id: int, body: StageUpdate, session: SessionDep) -> StageOut:
    stage = session.get(Stage, stage_id)
    if stage is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Stage {stage_id} not found")
    for name, value in body.model_dump(exclude_none=True).items():
        setattr(stage, name, value)
    session.commit()
    return StageOut.model_validate(stage)


ReportQuery = Annotated[int, Query(ge=1, le=520)]


@reports.get("/weekly", response_model=list[WeekRow])
def weekly(session: SessionDep, today: date | None = None, weeks: ReportQuery = 4) -> list[WeekRow]:
    df = weekly_report(session, today or date.today(), weeks)
    return [WeekRow.model_validate(row) for row in df.astype(object).to_dict("records")]


@reports.get("/weekly.csv")
def weekly_csv(session: SessionDep, today: date | None = None, weeks: ReportQuery = 4) -> Response:
    df = weekly_report(session, today or date.today(), weeks)
    return Response(content=df.to_csv(index=False), media_type="text/csv")


def create_app(engine: Engine) -> FastAPI:
    """The app, backed by this engine. Tests pass a fresh in-memory engine."""
    app = FastAPI(title="Job tracker")
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)
    for router in (companies, applications, stages, reports):
        app.include_router(router)
    return app
