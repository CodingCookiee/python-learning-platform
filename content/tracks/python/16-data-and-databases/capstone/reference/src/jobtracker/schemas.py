"""Request and response models."""

from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from jobtracker.models import Application, Outcome, Source, StageKind, Status


class CompanyIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    website: str | None = None


class CompanyOut(BaseModel):
    id: int
    name: str
    website: str | None
    applications: int
    active: int


class ApplicationIn(BaseModel):
    company_id: int
    role: str = Field(min_length=1, max_length=100)
    source: Source
    applied_on: date
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    notes: str = ""

    @model_validator(mode="after")
    def salary_range(self) -> Self:
        if self.salary_min is not None and self.salary_max is not None and self.salary_min > self.salary_max:
            raise ValueError("salary_min is above salary_max")
        return self


class ApplicationUpdate(BaseModel):
    status: Status | None = None
    notes: str | None = None


class StageIn(BaseModel):
    kind: StageKind
    scheduled_at: datetime
    notes: str = ""


class StageUpdate(BaseModel):
    outcome: Outcome | None = None
    notes: str | None = None


class StageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    scheduled_at: datetime
    outcome: str
    notes: str


class ApplicationOut(BaseModel):
    id: int
    company_id: int
    company: str
    role: str
    source: str
    status: str
    applied_on: date
    salary_min: int | None
    salary_max: int | None
    notes: str
    stages: list[StageOut]

    @classmethod
    def of(cls, application: Application) -> "ApplicationOut":
        stages = sorted(application.stages, key=lambda stage: (stage.scheduled_at, stage.id))
        return cls(
            id=application.id,
            company_id=application.company_id,
            company=application.company.name,
            role=application.role,
            source=application.source,
            status=application.status,
            applied_on=application.applied_on,
            salary_min=application.salary_min,
            salary_max=application.salary_max,
            notes=application.notes,
            stages=[StageOut.model_validate(stage) for stage in stages],
        )


class WeekRow(BaseModel):
    week: date
    applied: int
    responses: int
    interviews: int
    offers: int
    response_rate: float
    stages: int
